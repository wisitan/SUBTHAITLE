import { CaptionItem, CaptionWord, useAppStore } from './store';
import { cleanThaiText } from './thai-text';
import { groupWordsIntoCaptions, splitLongCaptions } from './caption-grouping';

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
  onProgress?: (stage: string) => void
): Promise<CaptionItem[]> {
  const store = useAppStore.getState();
  const { provider, tier, groqApiKey, dailyUsageCount, maxDailyFreeQuota } = store;

  // 1. Quota Check for Free Tier
  const isPaid = tier === 'coffee' || tier === 'meal';
  const isBYOK = provider === 'groq' && Boolean(groqApiKey);

  if (!isPaid && !isBYOK) {
    if (dailyUsageCount >= maxDailyFreeQuota) {
      throw new Error(
        `โควต้าฟรีประจำวันของคุณครบ ${maxDailyFreeQuota} คลิปแล้วค่ะ กรุณาร่วมสนับสนุนเพื่อปลดล็อกไม่จำกัด หรือใส่ Groq API Key ของตัวเอง (BYOK)`
      );
    }
  }

  if (onProgress) {
    onProgress('กำลังส่งไฟล์เสียงไปถอดข้อความด้วย AI...');
  }

  let data: TranscribeResponse;

  // 2. Execution path based on Provider / Mode
  if (isBYOK) {
    // BYOK Mode: Call Groq API directly from client (Bypasses server payload and timeout limits)
    if (onProgress) {
      onProgress('กำลังถอดเสียงผ่าน Groq API (BYOK Mode)...');
    }

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.mp3');
    formData.append('model', 'whisper-large-v3');
    formData.append('response_format', 'verbose_json');
    formData.append('language', 'th');
    formData.append('temperature', '0.0');
    formData.append('prompt', 'ตัดคำภาษาไทย เว้นวรรคตามหลักภาษาอย่างเป็นธรรมชาติ ซับไตเติลภาษาไทย');
    formData.append('timestamp_granularities[]', 'word');
    formData.append('timestamp_granularities[]', 'segment');

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey.trim()}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      let msg = `Groq API Error (${res.status})`;
      try {
        const json = JSON.parse(errText);
        msg = json.error?.message || msg;
      } catch {
        // use default
      }
      throw new Error(`การถอดเสียงล้มเหลว: ${msg}`);
    }

    data = await res.json();
  } else if (provider === 'local') {
    // Local Whisper Mode (Offline Mac MLX)
    if (onProgress) {
      onProgress('กำลังเชื่อมต่อไปยัง Local Whisper Server ในเครื่อง...');
    }

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.mp3');

    try {
      const res = await fetch('http://127.0.0.1:8765/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Local Whisper Server returned status ${res.status}`);
      }

      data = await res.json();
    } catch {
      throw new Error(
        'ไม่สามารถเชื่อมต่อ Local Whisper Server ได้ กรุณาตรวจสอบว่าได้เปิดคำสั่งรัน Local Server ในเครื่องแล้ว (python engine/local_server.py)'
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

    const res = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'เกิดข้อผิดพลาดในการถอดเสียงจากเซิร์ฟเวอร์');
    }

    // Increment daily usage for Free tier
    store.incrementDailyUsage();
  }

  if (onProgress) {
    onProgress('จัดกลุ่มคำและคำนวณจังหวะซับไตเติล (Smart Pacing)...');
  }

  // 3. Extract and Clean Word-level Timestamps
  const words: CaptionWord[] = (data.words || [])
    .map((w) => ({
      word: cleanThaiText(w.word),
      start: Number(w.start),
      end: Number(w.end),
      confidence: w.confidence,
    }))
    .filter((w) => w.word.length > 0);

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
    const rawCaps: CaptionItem[] = data.segments.map((seg, idx) => ({
      id: `seg-${idx}-${Date.now().toString(36)}`,
      start: Number(seg.start),
      end: Number(seg.end),
      text: cleanThaiText(seg.text),
    }));
    captions = splitLongCaptions(rawCaps);
  } else if (data.text) {
    // Fallback: Raw text
    captions = splitLongCaptions([
      {
        id: `raw-0-${Date.now().toString(36)}`,
        start: 0,
        end: data.duration || 5,
        text: cleanThaiText(data.text),
      },
    ]);
  }

  return captions;
}
