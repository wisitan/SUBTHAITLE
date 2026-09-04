import {
  CaptionItem,
  CaptionWord,
  useAppStore,
  calculateCreditUsage,
} from './store';
import { cleanThaiText, resegmentThaiWords } from './thai-text';
import { groupWordsIntoCaptions, splitLongCaptions } from './caption-grouping';
import { applyDictionaryToWords, applyDictionaryReplacements } from './default-dictionary';

export interface TranscribeResponse {
  success: boolean;
  text: string;
  duration?: number;
  provider?: string;
  model?: string;
  providerFallback?: string;
  segments?: Array<{
    id?: number | string;
    start: number;
    end: number;
    text: string;
  }>;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence?: number;
  }>;
  error?: string;
}

/**
 * Transcribes audio blob in a single step using the configured STT Provider (Free 3 clips/day or Credits)
 */
export async function transcribeAudio(
  audioBlob: Blob,
  onProgress?: (stage: string) => void,
  authInfo?: { userId?: string; tier?: string; signal?: AbortSignal }
): Promise<CaptionItem[]> {
  const store = useAppStore.getState();
  const { providerMode, creditsMinutes, mediaDuration } = store;
  const isFreeMode = providerMode === 'free' || providerMode === 'groq_free' || providerMode === 'google_free';

  // 1. Quota & Credit Validation
  let requiredCredits = 0;

  if (isFreeMode) {
    if (mediaDuration > 125) {
      throw new Error(
        'โหมดใช้งานฟรีรองรับคลิปยาวไม่เกิน 2 นาที กรุณาเลือกโหมด "โควต้าผู้สนับสนุน" เพื่อถอดเสียงคลิปยาวสูงสุด 30 นาที หรือตัดแบ่งคลิปก่อนค่ะ'
      );
    }
  } else if (providerMode === 'credits') {
    if (mediaDuration > 1830) {
      throw new Error(
        'ระบบรองรับคลิปยาวสูงสุดไม่เกิน 30 นาทีต่อคลิป เพื่อความเสถียรในการประมวลผล กรุณาตัดแบ่งคลิปเป็นช่วงไม่เกิน 30 นาทีนะคะ'
      );
    }
    requiredCredits = calculateCreditUsage(mediaDuration);
    if (creditsMinutes < requiredCredits) {
      throw new Error(
        `เครดิตของคุณคงเหลือ ${creditsMinutes} นาที (คลิปนี้ต้องใช้ ${requiredCredits} นาที) กรุณาเติมเครดิตเพิ่มก่อนกดถอดเสียงค่ะ`
      );
    }
  }

  if (onProgress) {
    onProgress('กำลังส่งไฟล์เสียงไปถอดข้อความด้วย AI...');
  }

  // 2. Transcription Request to Backend with Auto-Queue & Retry on Rate Limit
  const MAX_QUEUE_ATTEMPTS = 5;
  let attempt = 0;
  let data: (TranscribeResponse & { usedQuotaCount?: number; remainingQuota?: number }) | null = null;

  while (attempt < MAX_QUEUE_ATTEMPTS) {
    attempt++;
    if (onProgress && attempt > 1) {
      onProgress(`กำลังส่งคำร้องขอไปถอดเสียงใหม่ตามคิว (รอบที่ ${attempt}/${MAX_QUEUE_ATTEMPTS})...`);
    }

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.mp3');
    formData.append('language', 'th');
    formData.append('mode', isFreeMode ? 'free' : 'credits');
    formData.append('duration', mediaDuration.toString());
    formData.append('attempt', attempt.toString());
    if (authInfo?.userId) {
      formData.append('userId', authInfo.userId);
    }

    const res = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
      signal: authInfo?.signal,
    });

    let resText = '';
    interface BackendResponse extends Partial<TranscribeResponse> {
      usedQuotaCount?: number;
      remainingQuota?: number;
      isRateLimit?: boolean;
      retryAfter?: number;
      message?: string;
      provider?: string;
      model?: string;
      providerFallback?: string;
    }
    let parsedJson: BackendResponse | null = null;
    try {
      resText = await res.text();
      parsedJson = JSON.parse(resText) as BackendResponse;
    } catch {
      // Non-JSON response
    }

    // Check for Rate Limit / Queue (HTTP 429)
    if (res.status === 429 || parsedJson?.isRateLimit || parsedJson?.error === 'RATE_LIMIT_EXCEEDED') {
      if (attempt >= MAX_QUEUE_ATTEMPTS) {
        throw new Error(parsedJson?.message || 'ช่องสัญญาณหนาแน่นเกินกำหนด กรุณาลองใหม่อีกครั้งในภายหลังค่ะ');
      }

      const waitSeconds = Number(parsedJson?.retryAfter) || (isFreeMode ? 15 : 5);
      for (let sec = waitSeconds; sec > 0; sec--) {
        if (authInfo?.signal?.aborted) {
          throw new Error('การถอดเสียงถูกยกเลิก');
        }
        if (onProgress) {
          const queueMsg = isFreeMode
            ? `⚠️ ช่องสัญญาณฟรีกำลังหนาแน่น (15 ครั้ง/นาที) • กำลังรอคิวส่งซ้ำอัตโนมัติในอีก ${sec} วินาที... (รอบที่ ${attempt}/${MAX_QUEUE_ATTEMPTS})`
            : `⏳ สัญญาณระบบกำลังรอคิว • กำลังลองใหม่อัตโนมัติในอีก ${sec} วินาที... (รอบที่ ${attempt}/${MAX_QUEUE_ATTEMPTS})`;
          onProgress(queueMsg);
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      continue;
    }

    if (!res.ok || !parsedJson || !parsedJson.success) {
      throw new Error(
        parsedJson?.error ||
        `เซิร์ฟเวอร์ส่งการตอบกลับที่ไม่ถูกต้อง (${res.status}): ${resText.slice(0, 150) || 'กรุณาลองใหม่อีกครั้ง'}`
      );
    }

    data = parsedJson as TranscribeResponse & {
      usedQuotaCount?: number;
      remainingQuota?: number;
      provider?: string;
      model?: string;
      providerFallback?: string;
    };
    break; // Success!
  }

  if (!data) {
    throw new Error('เกิดข้อผิดพลาดในการรับข้อมูลการถอดเสียงจากเซิร์ฟเวอร์');
  }

  // Save transcription provider & model info for UI badge transparency
  store.setTranscriptionMeta({
    provider: data.provider || 'gemini',
    model: data.model || 'gemini-3.8-flash',
    isFallback: Boolean(data.providerFallback),
  });

  // Update Quota / Credits on successful transcription
  if (providerMode === 'credits' && requiredCredits > 0) {
    store.deductCredits(requiredCredits);
  } else if (isFreeMode) {
    if (typeof data.usedQuotaCount === 'number') {
      store.setGroqDailyUsageCount(data.usedQuotaCount, authInfo?.userId);
    } else {
      store.incrementGroqDailyUsage(authInfo?.userId);
    }
  }

  if (onProgress) {
    onProgress('จัดกลุ่มคำและคำนวณจังหวะซับไตเติล (Smart Pacing)...');
  }

  // 3. Extract and Clean Word-level Timestamps
  const rawWordTokens: CaptionWord[] = (data.words || [])
    .map((w) => {
      const match = w.word.match(/^(\s*)(.*?)(\s*)$/);
      const leading = match?.[1] || '';
      const core = match?.[2] || '';
      const trailing = match?.[3] || '';

      return {
        word: leading + cleanThaiText(core) + trailing,
        start: Number(w.start),
        end: Number(w.end),
        confidence: w.confidence,
      };
    })
    .filter((w) => w.word.trim().length > 0);

  // Timeline Calibration: If AI timestamps accumulated late drift beyond actual media duration,
  // linearly calibrate word timestamps to lock perfectly to the real media playback clock.
  if (mediaDuration > 0 && rawWordTokens.length > 0) {
    const maxEnd = Math.max(...rawWordTokens.map((w) => w.end));
    if (maxEnd > mediaDuration + 0.3) {
      const scale = Math.max(0.75, mediaDuration / maxEnd);
      rawWordTokens.forEach((w) => {
        w.start = Number((w.start * scale).toFixed(2));
        w.end = Number((w.end * scale).toFixed(2));
      });
    }
  }

  // Re-segment broken Whisper Thai subword tokens into proper linguistic words
  const segmentedWords = resegmentThaiWords(rawWordTokens);

  // Apply Dictionary corrections (Core + Supabase custom dictionary)
  const words = applyDictionaryToWords(segmentedWords, store.customDictionary);

  // Save raw words in store for instant live re-pacing
  store.setRawWords(words);

  let captions: CaptionItem[] = [];

  if (words.length > 0) {
    // Primary Engine: Group words according to user's pacing preference
    captions = groupWordsIntoCaptions(words, {
      mode: store.pacingMode,
      maxWordsPerLine: store.customMaxWords,
    });
  } else if (data.segments && data.segments.length > 0) {
    // Fallback: Segment-based splitting
    const rawCaps: CaptionItem[] = data.segments.map((seg, idx) => {
      const txt = cleanThaiText(applyDictionaryReplacements(seg.text, store.customDictionary));
      return {
        id: `seg-${idx}-${Date.now().toString(36)}`,
        start: Number(seg.start),
        end: Number(seg.end),
        text: txt,
        originalText: txt,
      };
    });
    captions = splitLongCaptions(rawCaps);
  } else if (data.text) {
    // Fallback: Raw text
    const txt = cleanThaiText(applyDictionaryReplacements(data.text, store.customDictionary));
    captions = splitLongCaptions([
      {
        id: `raw-0-${Date.now().toString(36)}`,
        start: 0,
        end: data.duration || 5,
        text: txt,
        originalText: txt,
      },
    ]);
  }

  return captions;
}
