import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max execution time for Vercel functions

// Quota Rules: Free = 3/day, Paid (Supporter/Pro) = 5/day, Global = 200/day
const MAX_REQUESTS_FREE_PER_DAY = 3;
const MAX_REQUESTS_PAID_PER_DAY = 5;
const MAX_GLOBAL_REQUESTS_PER_DAY = 200;

// Initialize Upstash Redis if environment variables are provided
let redisClient: Redis | null = null;
let freeLimiter: Ratelimit | null = null;
let paidLimiter: Ratelimit | null = null;
let globalLimiter: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    freeLimiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(MAX_REQUESTS_FREE_PER_DAY, '1 d'),
      prefix: 'subthaitle:free',
    });

    paidLimiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(MAX_REQUESTS_PAID_PER_DAY, '1 d'),
      prefix: 'subthaitle:paid',
    });

    globalLimiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(MAX_GLOBAL_REQUESTS_PER_DAY, '1 d'),
      prefix: 'subthaitle:global',
    });
  } catch (err) {
    console.warn('Failed to initialize Upstash Redis ratelimiter:', err);
  }
}

// In-memory fallback sliding rate limiter for local dev
const memoryRequestCounts = new Map<string, { count: number; resetAt: number }>();
let globalRequestCount = 0;
let globalResetAt = Date.now() + 24 * 60 * 60 * 1000;

async function checkRateLimits(
  identifier: string,
  isPaidUser: boolean
): Promise<{ allowed: boolean; reason?: string }> {
  const maxLimit = isPaidUser ? MAX_REQUESTS_PAID_PER_DAY : MAX_REQUESTS_FREE_PER_DAY;

  // 1. If Redis is configured, use Upstash sliding window rate limiting
  if (globalLimiter && freeLimiter && paidLimiter) {
    try {
      const activeLimiter = isPaidUser ? paidLimiter : freeLimiter;
      const [globalResult, tierResult] = await Promise.all([
        globalLimiter.limit('global_transcribe_usage'),
        activeLimiter.limit(identifier),
      ]);

      if (!globalResult.success) {
        return {
          allowed: false,
          reason: 'โควต้าฟรีรวมของเซิร์ฟเวอร์ประจำวันเต็มแล้วค่ะ เพื่อป้องกันค่าใช้จ่ายเกินลิมิต กรุณาใส่ Groq API Key ของตัวเอง (BYOK) หรือรัน Local Whisper เพื่อใช้งานต่อ',
        };
      }

      if (!tierResult.success) {
        return {
          allowed: false,
          reason: isPaidUser
            ? `โควต้าประจำวันของคุณครบ ${MAX_REQUESTS_PAID_PER_DAY} คลิปแล้วค่ะ กรุณาใส่ Groq API Key ของคุณ (BYOK) เพื่อถอดเสียงต่อได้ไม่จำกัด`
            : `โควต้าฟรีประจำวันของคุณครบ ${MAX_REQUESTS_FREE_PER_DAY} คลิปแล้วค่ะ เข้าสู่ระบบหรือร่วมสนับสนุน 99฿ เพื่อรับโควต้า 5 คลิป/วัน และปลดล็อก BYOK ไม่จำกัด`,
        };
      }

      return { allowed: true };
    } catch (err) {
      console.warn('Redis rate limit check error, falling back to memory:', err);
    }
  }

  // 2. In-memory fallback for local development
  const now = Date.now();

  if (now > globalResetAt) {
    globalRequestCount = 0;
    globalResetAt = now + 24 * 60 * 60 * 1000;
    memoryRequestCounts.clear();
  }

  if (globalRequestCount >= MAX_GLOBAL_REQUESTS_PER_DAY) {
    return {
      allowed: false,
      reason: 'โควต้าฟรีรวมของเซิร์ฟเวอร์ประจำวันเต็มแล้วค่ะ กรุณาใส่ Groq API Key ของตัวเอง (BYOK) เพื่อใช้งานต่อ',
    };
  }

  const record = memoryRequestCounts.get(identifier);
  if (!record || now > record.resetAt) {
    memoryRequestCounts.set(identifier, {
      count: 1,
      resetAt: now + 24 * 60 * 60 * 1000,
    });
    globalRequestCount++;
    return { allowed: true };
  }

  if (record.count >= maxLimit) {
    return {
      allowed: false,
      reason: isPaidUser
        ? `โควต้าประจำวันของคุณครบ ${maxLimit} คลิปแล้วค่ะ ใส่ API Key ตัวเอง (BYOK) เพื่อใช้งานต่อได้ไม่จำกัด`
        : `โควต้าฟรีประจำวันของคุณครบ ${maxLimit} คลิปแล้วค่ะ ร่วมสนับสนุน 99฿ เพื่อเพิ่มโควต้าและปลดล็อก BYOK ไม่จำกัด`,
    };
  }

  record.count += 1;
  globalRequestCount++;
  return { allowed: true };
}

interface TranscribedWord {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

// 🧠 AI Auto-Correction (Post-Processing Engine)
// รองรับ Google Gemini (Flash / Pro) เป็นหลัก และ Fallback ไปยัง OpenAI (gpt-4o-mini)
async function correctThaiWordsWithLLM(
  words: TranscribedWord[],
  rawText: string
): Promise<{ words: TranscribedWord[]; text: string }> {
  if (words.length === 0) {
    return { words, text: rawText };
  }

  const wordListInput = words.map((w) => ({
    word: w.word,
    start: w.start,
    end: w.end,
  }));

  const systemPrompt =
    'You are an expert Thai speech transcription post-correction engine for video subtitles (Shorts, Reels, TikTok, product reviews). Your job is to fix phonetic errors, typos, homophones (e.g. ชาชาติ -> สายชาร์จ, สักเช่นนึง -> สักเส้นนึง, ดีดี -> ดีๆ, นะครับ -> นะครับ) based on video context (gadgets, technology, shopping, gaming). Maintain the exact same number of items and timestamps in the array. Return JSON only in this format: {"words": [{"word": "...", "start": 0.0, "end": 0.5}], "text": "Full corrected text"}';

  // 1. Primary Attempt: Google Gemini API (Flash / Pro)
  const geminiApiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_STT_API_KEY ||
    process.env.Google ||
    process.env.GOOGLE;

  if (geminiApiKey) {
    const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const model of candidateModels) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: systemPrompt }],
              },
              contents: [
                {
                  role: 'user',
                  parts: [{ text: JSON.stringify(wordListInput) }],
                },
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (jsonText) {
            const parsed = JSON.parse(jsonText);
            if (Array.isArray(parsed.words) && parsed.words.length === words.length) {
              const mergedWords: TranscribedWord[] = words.map((orig, i) => ({
                word: parsed.words[i].word || orig.word,
                start: typeof parsed.words[i].start === 'number' ? parsed.words[i].start : orig.start,
                end: typeof parsed.words[i].end === 'number' ? parsed.words[i].end : orig.end,
                confidence: orig.confidence,
              }));
              return {
                words: mergedWords,
                text: parsed.text || mergedWords.map((w) => w.word).join(' '),
              };
            }
          }
        }
      } catch {
        // Fallback to next model or OpenAI
      }
    }
  }

  // 2. Secondary Fallback: OpenAI (gpt-4o-mini / gpt-4o)
  const openAiApiKey = process.env.OPENAI_API_KEY;
  if (openAiApiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openAiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: JSON.stringify(wordListInput),
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.words) && parsed.words.length === words.length) {
            const mergedWords: TranscribedWord[] = words.map((orig, i) => ({
              word: parsed.words[i].word || orig.word,
              start: typeof parsed.words[i].start === 'number' ? parsed.words[i].start : orig.start,
              end: typeof parsed.words[i].end === 'number' ? parsed.words[i].end : orig.end,
              confidence: orig.confidence,
            }));
            return {
              words: mergedWords,
              text: parsed.text || mergedWords.map((w) => w.word).join(' '),
            };
          }
        }
      }
    } catch (err) {
      console.warn('[Auto-Correction OpenAI Fallback Exception]:', err);
    }
  }

  return { words, text: rawText };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('file') as Blob | null;
    const language = (formData.get('language') as string) || 'th';
    const userId = (formData.get('userId') as string) || null;
    const userTier = (formData.get('tier') as string) || 'free';
    const provider = (formData.get('provider') as string) || 'google';
    const mode = (formData.get('mode') as string) || 'google_free';
    const clientDuration = parseFloat((formData.get('duration') as string) || '0');

    const isPaidUser = userTier === 'tier_99' || userTier === 'tier_299' || mode === 'credits';

    // Identifier: Use userId if logged in, otherwise client IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';
    const rateLimitIdentifier = userId ? `user:${userId}` : `ip:${clientIp}`;

    // 1. Check Rate Limits
    const limitCheck = await checkRateLimits(rateLimitIdentifier, isPaidUser);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.reason }, { status: 429 });
    }

    if (!audioFile) {
      return NextResponse.json(
        { error: 'ไม่พบไฟล์เสียงในคำร้องขอ (No audio file provided)' },
        { status: 400 }
      );
    }

    // Free Mode 2-Minute Length Check (120s + 5s tolerance)
    if ((mode === 'google_free' || mode === 'groq_free') && clientDuration > 125) {
      return NextResponse.json(
        {
          error:
            'คลิปวิดีโอมีความยาวเกิน 2 นาทีสำหรับโหมดใช้งานฟรี กรุณาใช้เครดิตที่เติมไว้ หรือใช้โหมด BYOK เพื่อถอดเสียงคลิปยาวค่ะ',
        },
        { status: 400 }
      );
    }

    // Payload size check (Vercel Serverless Function limit = 4.5MB)
    const MAX_SERVER_AUDIO_BYTES = 4.2 * 1024 * 1024;
    if (audioFile.size > MAX_SERVER_AUDIO_BYTES) {
      return NextResponse.json(
        {
          error:
            'ขนาดไฟล์เสียงเกิน 4MB สำหรับเซิร์ฟเวอร์ฟรี กรุณาใช้โหมด BYOK เพื่อถอดเสียงไฟล์ขนาดใหญ่',
        },
        { status: 413 }
      );
    }

    // Route 1: Groq Cloud Whisper Engine
    if (provider === 'groq') {
      const groqApiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
      if (!groqApiKey) {
        return NextResponse.json(
          { error: 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า GROQ_API_KEY กรุณาตั้งค่าบน Vercel หรือใช้โหมด BYOK' },
          { status: 500 }
        );
      }

      const groqForm = new FormData();
      groqForm.append('file', audioFile, 'audio.mp3');
      groqForm.append('model', 'whisper-large-v3');
      groqForm.append('response_format', 'verbose_json');
      groqForm.append('language', language === 'th' ? 'th' : language);
      groqForm.append('temperature', '0.2');
      groqForm.append('timestamp_granularities[]', 'word');

      const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: groqForm,
      });

      if (!groqRes.ok) {
        const errText = await groqRes.text();
        return NextResponse.json({ error: `Groq Whisper Error: ${errText}` }, { status: groqRes.status });
      }

      const groqData = await groqRes.json();
      const words: TranscribedWord[] = (groqData.words || []).map((w: { word: string; start: number; end: number }) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: 0.95,
      }));

      return NextResponse.json({
        success: true,
        text: groqData.text || '',
        duration: groqData.duration || (words.length > 0 ? words[words.length - 1].end : 0),
        language: groqData.language || 'th',
        segments: groqData.segments || [],
        words,
      });
    }

    // Route 2: Google Cloud Speech-to-Text (+ AI Auto-Correction with GPT-4o-mini)
    const googleApiKey =
      process.env.GOOGLE_STT_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_SPEECH_API_KEY ||
      process.env.GOOGLE_CLOUD_API_KEY ||
      process.env.Google ||
      process.env.GOOGLE ||
      process.env.google ||
      process.env.NEXT_PUBLIC_GOOGLE_STT_API_KEY;

    if (!googleApiKey) {
      return NextResponse.json(
        {
          error:
            'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า Google API Key บน Vercel หรือใส่ API Key ในโหมด BYOK เพื่อใช้งาน',
        },
        { status: 500 }
      );
    }

    try {
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      const base64Audio = buffer.toString('base64');

      const googleResponse = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            config: {
              encoding: 'MP3',
              languageCode: language === 'en' ? 'en-US' : 'th-TH',
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
        }
      );

      if (!googleResponse.ok) {
        const errorText = await googleResponse.text();
        console.error('[Google STT Error]:', googleResponse.status, errorText);
        let parsedError = errorText;
        try {
          const errJson = JSON.parse(errorText);
          parsedError = errJson.error?.message || errorText;
        } catch {}
        return NextResponse.json(
          { error: `Google STT Error: ${parsedError}` },
          { status: googleResponse.status }
        );
      }

      const googleData = await googleResponse.json();
      const words: TranscribedWord[] = [];
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

      // Run AI Auto-Correction (Post-Processing)
      const corrected = await correctThaiWordsWithLLM(words, fullText);

      return NextResponse.json({
        success: true,
        text: corrected.text,
        duration: corrected.words.length > 0 ? corrected.words[corrected.words.length - 1].end : 0,
        language: 'th',
        segments: [],
        words: corrected.words,
      });
    } catch (err: unknown) {
      console.error('[Google STT Exception]:', err);
      const errMsg = err instanceof Error ? err.message : 'Google STT Failed';
      return NextResponse.json({ error: errMsg }, { status: 500 });
    }
  } catch (error) {
    console.error('[Transcribe Route Error]:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุในการถอดเสียง',
      },
      { status: 500 }
    );
  }
}
