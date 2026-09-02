import {
  CaptionItem,
  CaptionWord,
  useAppStore,
  calculateCreditUsage,
  getGroqDailyUsageFromStorage,
} from './store';
import { cleanThaiText, resegmentThaiWords } from './thai-text';
import { groupWordsIntoCaptions, splitLongCaptions } from './caption-grouping';
import { applyDictionaryToWords, applyDictionaryReplacements } from './default-dictionary';

export interface TranscribeResponse {
  success: boolean;
  text: string;
  duration?: number;
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
    const dailyUsage = getGroqDailyUsageFromStorage(authInfo?.userId);
    if (dailyUsage >= store.maxGroqDailyQuota) {
      throw new Error(
        `โควต้าฟรีประจำวันของคุณครบ ${store.maxGroqDailyQuota} คลิปแล้วค่ะ (รีเซ็ตใหม่ทุกเที่ยงคืน) หรือสามารถเติมเครดิตเพื่อถอดเสียงต่อได้ทันทีค่ะ`
      );
    }
    if (mediaDuration > 125) {
      throw new Error(
        'โหมดฟรีรองรับคลิปยาวไม่เกิน 2 นาที กรุณาเลือกโหมด "Credit ที่มี" เพื่อถอดเสียงคลิปยาว หรือตัดแบ่งคลิปก่อนค่ะ'
      );
    }
  } else if (providerMode === 'credits') {
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

  // 2. Single-Step Transcription Request to Backend
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.mp3');
  formData.append('language', 'th');
  formData.append('mode', isFreeMode ? 'free' : 'credits');
  formData.append('duration', mediaDuration.toString());
  if (authInfo?.userId) {
    formData.append('userId', authInfo.userId);
  }

  const res = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
    signal: authInfo?.signal,
  });

  let resText = '';
  let data: TranscribeResponse;
  try {
    resText = await res.text();
    data = JSON.parse(resText);
  } catch {
    throw new Error(
      `เซิร์ฟเวอร์ส่งการตอบกลับที่ไม่ถูกต้อง (${res.status}): ${resText.slice(0, 150) || 'กรุณาลองใหม่อีกครั้ง'}`
    );
  }

  if (!res.ok || !data || !data.success) {
    throw new Error(data?.error || 'เกิดข้อผิดพลาดในการถอดเสียงจากเซิร์ฟเวอร์');
  }

  // Update Quota / Credits on successful transcription
  if (providerMode === 'credits' && requiredCredits > 0) {
    store.deductCredits(requiredCredits);
  } else if (isFreeMode) {
    store.incrementGroqDailyUsage(authInfo?.userId);
  }
  store.incrementDailyUsage(authInfo?.userId);

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
