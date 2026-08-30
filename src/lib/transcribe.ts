import { CaptionItem, CaptionWord, useAppStore } from './store';
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
 * Transcribes audio blob using the configured provider (Groq Cloud, BYOK, or Local)
 */
export async function transcribeAudio(
  audioBlob: Blob,
  onProgress?: (stage: string) => void,
  authInfo?: { userId?: string; tier?: string }
): Promise<CaptionItem[]> {
  const store = useAppStore.getState();
  const { provider, groqApiKey, maxDailyFreeQuota } = store;
  const effectiveTier = authInfo?.tier || store.tier;

  // 1. Quota Check based on this specific user
  const isPaid = effectiveTier === 'tier_99' || effectiveTier === 'tier_299';
  const isBYOK = provider === 'groq' && Boolean(groqApiKey);
  const quotaLimit = isPaid ? 5 : maxDailyFreeQuota;
  const userUsage = store.getDailyUsage(authInfo?.userId);

  if (!isBYOK && userUsage >= quotaLimit) {
    throw new Error(
      isPaid
        ? `โควต้าประจำวันของบัญชีคุณครบ ${quotaLimit} คลิปแล้วค่ะ กรุณาใส่ Groq API Key ของคุณ (BYOK) เพื่อถอดเสียงต่อได้ไม่จำกัด`
        : `โควต้าฟรีประจำวันของบัญชีคุณครบ ${quotaLimit} คลิปแล้วค่ะ ร่วมสนับสนุน 99฿ เพื่อเพิ่มโควต้าและปลดล็อก BYOK ไม่จำกัด`
    );
  }

  if (onProgress) {
    onProgress('กำลังส่งไฟล์เสียงไปถอดข้อความด้วย AI...');
  }

  let data: TranscribeResponse;

  // 2. Execution path based on Provider / Mode
  if (isBYOK) {
    const trimmedKey = groqApiKey.trim();
    const isGoogle = trimmedKey.startsWith('AIza');
    const isOpenAI = trimmedKey.startsWith('sk-');

    if (isGoogle) {
      // BYOK Google Cloud STT
      if (onProgress) {
        onProgress('กำลังถอดเสียงผ่าน Google Cloud Speech-to-Text (BYOK)...');
      }

      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            const base64 = reader.result.split(',')[1] || '';
            resolve(base64);
          } else {
            reject(new Error('ไม่สามารถแปลงไฟล์เป็น Base64 ได้'));
          }
        };
        reader.onerror = () => reject(new Error('เกิดข้อผิดพลาดในการอ่านไฟล์'));
        reader.readAsDataURL(audioBlob);
      });

      const res = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${trimmedKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            encoding: 'MP3',
            languageCode: 'th-TH',
            enableWordTimeOffsets: true,
            enableAutomaticPunctuation: true,
            useEnhanced: true,
            speechContexts: [
              {
                phrases: [
                  'สายชาร์จ', 'หัวชาร์จ', 'เก้าสิบองศา', 'เล่นเกม', 'จ่ายไฟ', 'วัตต์', 'แอมป์',
                  'ฟาสต์ชาร์จ', 'พาวเวอร์แบงค์', 'แนะนำ', 'รีวิว', 'คลิปนี้', 'สวัสดีครับ', 'สวัสดีค่ะ',
                  'ตัวนี้', 'อันนี้', 'แบบนี้', 'ราคา', 'โปรโมชั่น', 'ส่งฟรี', 'ของแท้', 'ประกัน',
                  'สักเส้นนึง', 'ความยาว', 'ทนทาน', 'ชาร์จไว', 'ชาร์จเร็ว', 'ตัวเนี้ย', 'เล่นเกมไปด้วย'
                ],
                boost: 15.0,
              },
            ],
            model: 'default',
          },
          audio: {
            content: base64Audio,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        let msg = `Google Cloud STT Error (${res.status})`;
        try {
          const json = JSON.parse(errText);
          msg = json.error?.message || msg;
        } catch {}
        throw new Error(`การถอดเสียงด้วย Google Cloud ล้มเหลว: ${msg}`);
      }

      const googleData = await res.json();
      const words: Array<{ word: string; start: number; end: number; confidence: number }> = [];
      let fullText = '';

      for (const result of googleData.results || []) {
        const alt = result.alternatives?.[0];
        if (alt) {
          fullText += (fullText ? ' ' : '') + (alt.transcript || '');
          if (alt.words) {
            for (const w of alt.words) {
              const startStr = w.startTime || '0s';
              const endStr = w.endTime || '0s';
              const startSec = parseFloat(startStr.replace('s', '')) || 0;
              const endSec = parseFloat(endStr.replace('s', '')) || 0;
              words.push({
                word: w.word,
                start: startSec,
                end: endSec,
                confidence: alt.confidence || 0.95,
              });
            }
          }
        }
      }

      data = {
        success: true,
        text: fullText,
        duration: words.length > 0 ? words[words.length - 1].end : 0,
        words,
      };
    } else {
      // BYOK OpenAI or Groq
      const providerLabel = isOpenAI ? 'OpenAI Whisper (BYOK)' : 'Groq Whisper (BYOK)';
      const apiUrl = isOpenAI
        ? '/api/proxy/openai/v1/audio/transcriptions'
        : '/api/proxy/groq/openai/v1/audio/transcriptions';
      const targetModel = isOpenAI ? 'whisper-1' : 'whisper-large-v3';

      if (onProgress) {
        onProgress(`กำลังถอดเสียงผ่าน ${providerLabel}...`);
      }

      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.mp3');
      formData.append('model', targetModel);
      formData.append('response_format', 'verbose_json');
      formData.append('language', 'th');
      formData.append('temperature', '0.2');
      formData.append('prompt', 'สวัสดีครับ นี่คือคำบรรยายวิดีโอภาษาไทย');
      formData.append('timestamp_granularities[]', 'word');
      formData.append('timestamp_granularities[]', 'segment');

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${trimmedKey}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        let msg = `${isOpenAI ? 'OpenAI' : 'Groq'} API Error (${res.status})`;
        try {
          const json = JSON.parse(errText);
          msg = json.error?.message || msg;
        } catch {}
        throw new Error(`การถอดเสียงล้มเหลว: ${msg}`);
      }

      data = await res.json();
    }
  } else if (provider === 'local') {
    // Local Whisper Mode (Offline Mac MLX)
    if (onProgress) {
      onProgress('กำลังเชื่อมต่อไปยัง Local Whisper Server ในเครื่อง...');
    }

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.mp3');
    formData.append('language', 'th');

    try {
      const res = await fetch('http://127.0.0.1:8765/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || `Local Whisper Server returned status ${res.status}`);
      }

      data = await res.json();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('Local Transcription Failed') || message.includes('status')) {
        throw new Error(message);
      }
      throw new Error(
        'ไม่สามารถเชื่อมต่อ Local Whisper Server ได้ กรุณาดาวน์โหลดและเปิดใช้งาน start_server บนเครื่องของคุณก่อนกดถอดเสียงค่ะ (http://localhost:8765)'
      );
    }
  } else {
    // Default Free Cloud Mode (Next.js Server API route)
    if (onProgress) {
      onProgress('กำลังส่งไฟล์เสียงไปที่เซิร์ฟเวอร์ระบบ...');
    }

    // Safety check for Vercel 4.5MB payload limit
    if (audioBlob.size > 4.2 * 1024 * 1024) {
      throw new Error(
        'ขนาดไฟล์เสียงเกิน 4MB สำหรับเซิร์ฟเวอร์ฟรี กรุณาใส่ Groq API Key ของคุณเอง (BYOK) เพื่อถอดเสียงไฟล์ขนาดใหญ่ได้ทันที'
      );
    }

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.mp3');
    formData.append('language', 'th');
    formData.append('model', 'whisper-large-v3');
    if (authInfo?.userId) {
      formData.append('userId', authInfo.userId);
    }
    formData.append('tier', effectiveTier);

    const res = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'เกิดข้อผิดพลาดในการถอดเสียงจากเซิร์ฟเวอร์');
    }

    // Increment daily usage for this user
    store.incrementDailyUsage(authInfo?.userId);
  }

  if (onProgress) {
    onProgress('จัดกลุ่มคำและคำนวณจังหวะซับไตเติล (Smart Pacing)...');
  }

  // 3. Extract and Clean Word-level Timestamps
  const rawWordTokens: CaptionWord[] = (data.words || [])
    .map((w) => {
      // Preserve Whisper's native leading/trailing spaces while cleaning the text
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
