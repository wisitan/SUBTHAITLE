import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max execution time for Vercel functions

function getSupabaseAdmin() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function calculateCreditUsage(durationSeconds: number): number {
  const roundedSecs = Math.round(durationSeconds);
  if (roundedSecs <= 0) return 0;
  const fullMinutes = Math.floor(roundedSecs / 60);
  const remainingSeconds = roundedSecs % 60;
  if (fullMinutes === 0) return 1;
  if (remainingSeconds > 40) return fullMinutes + 1;
  return fullMinutes;
}

// 🛡️ Global Safety Budget Rules (Cost Protection Caps for Free Tiers)
// 1. Google AI Free Tier: Max 300 THB / month (~357 minutes / 180 clips per month across all free users)
const GLOBAL_GOOGLE_MONTHLY_CAP_CLIPS = 180;

// 2. Groq AI Free Tier: Max 200 THB / month -> ~6.67 THB / day (~100 minutes / 60 clips per day across all free users)
const GLOBAL_GROQ_DAILY_CAP_CLIPS = 60;

// Initialize Upstash Redis if environment variables are provided
let redisClient: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch (err) {
    console.warn('Failed to initialize Upstash Redis:', err);
  }
}

// In-memory fallback tracking for local development
let memoryGoogleMonthlyClips = 0;
let memoryGoogleMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

let memoryGroqDailyClips = 0;
let memoryGroqDay = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const GOOGLE_BUDGET_EXCEEDED_MSG =
  'โควต้าใช้งานฟรีด้วย Google AI ของระบบในเดือนนี้เต็มแล้วค่ะ เนื่องจากแต่ละคลิปมีต้นทุนค่า API ที่ทางทีมผู้พัฒนาต้องรับภาระ โดยโควต้าฟรีจะรีเซ็ตใหม่อีกครั้งในวันที่ 1 ของเดือนถัดไป หรือสามารถเติมเครดิต / ใช้โหมด Groq AI / BYOK เพื่อใช้งานต่อได้ทันทีค่ะ';

const GROQ_BUDGET_EXCEEDED_MSG =
  'โควต้าใช้งานฟรีด้วย Groq AI ของระบบในวันนี้เต็มแล้วค่ะ เนื่องจากมีผู้ใช้งานครบโควต้าสนับสนุนประจำวันแล้ว (ระบบจะรีเซ็ตโควต้าฟรีใหม่ทุกเที่ยงคืน) กรุณากลับมาใหม่ในวันพรุ่งนี้ หรือเติมเครดิตเพื่อใช้งานต่อได้ทันทีค่ะ';

async function checkSafetyBudget(
  provider: 'google' | 'groq',
  isPaidUser: boolean
): Promise<{ allowed: boolean; reason?: string }> {
  // Paid credit users are NEVER blocked by budget caps
  if (isPaidUser) {
    return { allowed: true };
  }

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
  const currentDay = now.toISOString().slice(0, 10);   // YYYY-MM-DD

  // 1. Google Free Mode Budget Check (300 THB / month ~ 180 clips)
  if (provider === 'google') {
    if (redisClient) {
      try {
        const count = await redisClient.get<number>(`subthaitle:budget:google:${currentMonth}`);
        if (count && count >= GLOBAL_GOOGLE_MONTHLY_CAP_CLIPS) {
          return {
            allowed: false,
            reason: GOOGLE_BUDGET_EXCEEDED_MSG,
          };
        }
      } catch (err) {
        console.warn('Redis budget check error:', err);
      }
    } else {
      if (memoryGoogleMonth !== currentMonth) {
        memoryGoogleMonth = currentMonth;
        memoryGoogleMonthlyClips = 0;
      }
      if (memoryGoogleMonthlyClips >= GLOBAL_GOOGLE_MONTHLY_CAP_CLIPS) {
        return {
          allowed: false,
          reason: GOOGLE_BUDGET_EXCEEDED_MSG,
        };
      }
    }
  }

  // 2. Groq Free Mode Budget Check (200 THB / month ~ 6.67 THB/day ~ 60 clips/day)
  if (provider === 'groq') {
    if (redisClient) {
      try {
        const count = await redisClient.get<number>(`subthaitle:budget:groq:${currentDay}`);
        if (count && count >= GLOBAL_GROQ_DAILY_CAP_CLIPS) {
          return {
            allowed: false,
            reason: GROQ_BUDGET_EXCEEDED_MSG,
          };
        }
      } catch (err) {
        console.warn('Redis budget check error:', err);
      }
    } else {
      if (memoryGroqDay !== currentDay) {
        memoryGroqDay = currentDay;
        memoryGroqDailyClips = 0;
      }
      if (memoryGroqDailyClips >= GLOBAL_GROQ_DAILY_CAP_CLIPS) {
        return {
          allowed: false,
          reason: GROQ_BUDGET_EXCEEDED_MSG,
        };
      }
    }
  }

  return { allowed: true };
}

async function recordSafetyBudgetUsage(provider: 'google' | 'groq', isPaidUser: boolean) {
  if (isPaidUser) return;

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const currentDay = now.toISOString().slice(0, 10);

  if (provider === 'google') {
    if (redisClient) {
      try {
        await redisClient.incr(`subthaitle:budget:google:${currentMonth}`);
        await redisClient.expire(`subthaitle:budget:google:${currentMonth}`, 35 * 24 * 3600);
      } catch {}
    } else {
      memoryGoogleMonthlyClips++;
    }
  }

  if (provider === 'groq') {
    if (redisClient) {
      try {
        await redisClient.incr(`subthaitle:budget:groq:${currentDay}`);
        await redisClient.expire(`subthaitle:budget:groq:${currentDay}`, 2 * 24 * 3600);
      } catch {}
    } else {
      memoryGroqDailyClips++;
    }
  }
}

interface TranscribedWord {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

function alignCorrectedWords(
  originalWords: TranscribedWord[],
  correctedWords: (string | { word: string })[]
): TranscribedWord[] {
  if (originalWords.length === 0 || correctedWords.length === 0) return originalWords;

  // Case 1: Exact 1-to-1 match
  if (originalWords.length === correctedWords.length) {
    return originalWords.map((orig, i) => {
      const item = correctedWords[i];
      const wordStr = typeof item === 'string' ? item : item?.word || orig.word;
      return {
        word: wordStr,
        start: orig.start,
        end: orig.end,
        confidence: orig.confidence,
      };
    });
  }

  // Case 2: Length difference (e.g. 3 tokens 'วิธี' 'ใช้' 'สี' merged into 'Type-C')
  const totalStart = originalWords[0].start;
  const totalEnd = originalWords[originalWords.length - 1].end;
  const totalDuration = Math.max(0.1, totalEnd - totalStart);
  const count = correctedWords.length;
  const step = totalDuration / count;

  return correctedWords.map((item, idx) => {
    const wordStr = typeof item === 'string' ? item : item?.word || '';
    return {
      word: wordStr,
      start: parseFloat((totalStart + idx * step).toFixed(2)),
      end: parseFloat((totalStart + (idx + 1) * step).toFixed(2)),
      confidence: 0.95,
    };
  });
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

  // Optimize payload: ส่งเฉพาะคำภาษาไทยแบบ string array เพื่อประหยัด Tokens 70%
  const wordStringsInput = words.map((w) => w.word);

  const systemPrompt = `You are the world's most accurate Thai speech subtitle correction engine, specialized in video content (Shorts, TikTok, YouTube Reviews, Tech Gadgets, Cooking, Lifestyle).

TASK: Given an array of Thai words from speech recognition and the full raw transcript, fix phonetic errors, sound-alikes, garbled English loanwords, and Thai-specific mistakes using full sentence context.

CORRECTION RULES (organized by category):

【CONNECTORS & CABLES】
- "วิธีใช้ สี" / "วิธีใช้สี" / "วิธี ซี" / "วิทีซี" / "ไทป์สี" / "ไทบซี" / "ไทป์ ซี" → "Type-C"
- "usb แอมป์" / "usb แอม" / "ยูเอสบี แอมป์" / "ยูเอสบีเอ" → "USB-A"
- "ยูเอสบี ซี" / "usb ซี" / "ยูเอสบี ไทป์ซี" → "USB-C"
- "ไมโคร ยูเอสบี" / "ไมโคร usb" → "Micro USB"
- "ไลท์นิ่ง" / "ไลนิ่ง" / "ไลท์นิง" → "Lightning"

【CHARGING & POWER】
- "ชาชาติ" / "ชาจ" / "ชาร์ท" / "ชาช" → "ชาร์จ"
- "สาย" + (ชาชาติ/ชาจ/ชาร์ท) → "สายชาร์จ"
- "หัว" + (ชาชาติ/ชาจ/ชาร์ท) → "หัวชาร์จ"
- "ฟาสชาร์จ" / "ฟาสต์ชาร์ต" / "ฟาสชาจ" → "Fast Charge"
- "พาวเวอร์แบง" / "พาเวอร์แบงค์" / "เพาเวอร์แบงค์" → "Power Bank"
- "หกสิบ ดับเบิลยู" → "60W", "ร้อย ดับเบิลยู" → "100W"
- "แอมแปร์" / "แอมป์แปร์" → "แอมป์"

【THAI PHONETIC PATTERNS】
- Reduplication: "ดีดี" → "ดีๆ", "เร็วเร็ว" → "เร็วๆ", "มากมาก" → "มากๆ", "จริงจริง" → "จริงๆ", "ค่อยค่อย" → "ค่อยๆ", "ช้าช้า" → "ช้าๆ"
- Colloquial: "ตัวเนีย" / "ตัวเนี้ย" → "ตัวนี้", "งี้" → "นี้", "เนี่ย" → "นี่", "ป่ะ" → "ไหม"
- Particles: "น่ะ" → "นะ", "จ้า" → "จ้ะ", "คร้าบ" → "ครับ", "ค่า" → "ค่ะ"
- Sound-alikes: "สักเช่นนึง" → "สักเส้นนึง", "ปะกัน" → "ประกัน"

【BRANDS & PLATFORMS】
- Fix known brand misspellings contextually (Samsung, iPhone, iPad, AirPods, Shopee, Lazada, etc.)

STRICT OUTPUT FORMAT:
Return JSON only: {"words": ["word1", "word2", ...], "text": "Full corrected sentence"}
The "words" array represents the corrected words in chronological order. You MAY merge or split tokens if the correction requires it.

FEW-SHOT EXAMPLES:
Input: ["ตัวนี้", "เป็น", "สาย", "ชาชาติ", "วิธีใช้", "สี", "ชาร์จ", "เร็ว", "หกสิบ", "วัตต์"]
Output: {"words": ["ตัวนี้", "เป็น", "สายชาร์จ", "Type-C", "ชาร์จเร็ว", "60W"], "text": "ตัวนี้เป็นสายชาร์จ Type-C ชาร์จเร็ว 60W"}

Input: ["มี", "ทั้ง", "แบบ", "usb", "แอมป์", "ธรรมดา", "ดึง", "ออก", "มา", "ก็", "สามารถ"]
Output: {"words": ["มี", "ทั้ง", "แบบ", "USB-A", "ธรรมดา", "ดึง", "ออก", "มา", "ก็", "สามารถ"], "text": "มีทั้งแบบ USB-A ธรรมดา ดึงออกมาก็สามารถ"}`;

  // Build user message with full context
  const userMessage = `Full Transcript Context:\n"${rawText}"\n\nOriginal Words Array:\n${JSON.stringify(wordStringsInput)}`;

  // 1. Primary Attempt: Google Gemini API (Google AI Studio)
  const geminiApiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    ''
  ).trim();

  if (geminiApiKey) {
    const candidateModels = [
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-2.5-flash',
    ];
    for (const model of candidateModels) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(4000),
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: systemPrompt }],
              },
              contents: [
                {
                  role: 'user',
                  parts: [{ text: userMessage }],
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
            const rawWordsList = parsed.words;
            if (Array.isArray(rawWordsList) && rawWordsList.length > 0) {
              const mergedWords = alignCorrectedWords(words, rawWordsList);
              return {
                words: mergedWords,
                text: parsed.text || mergedWords.map((w) => w.word).join(' '),
              };
            }
          }
        } else if (geminiRes.status === 400 || geminiRes.status === 403 || geminiRes.status === 404) {
          break;
        }
      } catch (err) {
        console.warn(`[Gemini Fallback]: Model ${model} failed, skipping...`, err);
        break;
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
        signal: AbortSignal.timeout(4000),
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userMessage,
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
          const rawWordsList = parsed.words;
          if (Array.isArray(rawWordsList) && rawWordsList.length > 0) {
            const mergedWords = alignCorrectedWords(words, rawWordsList);
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

    const isPaidUser = userTier === 'tier_99' || userTier === 'tier_299' || userTier === 'tier_699' || mode === 'credits';

    // 1. Check Global Safety Budget Caps for Free Tiers
    const budgetCheck = await checkSafetyBudget(provider as 'google' | 'groq', isPaidUser);
    if (!budgetCheck.allowed) {
      return NextResponse.json({ error: budgetCheck.reason }, { status: 429 });
    }

    if (!audioFile) {
      return NextResponse.json(
        { error: 'ไม่พบไฟล์เสียงในคำร้องขอ (No audio file provided)' },
        { status: 400 }
      );
    }

    // 2. Server-side Supabase Credit & Quota Validation
    const supabase = getSupabaseAdmin();
    let creditsPreDeducted = 0;

    const refundCreditsIfFailed = async () => {
      if (creditsPreDeducted > 0 && supabase && userId) {
        try {
          await supabase.rpc('add_user_credits', {
            p_user_id: userId,
            p_minutes: creditsPreDeducted,
            p_description: 'คืนเครดิตเนื่องจากการถอดเสียงล้มเหลว (Auto-Refund)',
          });
          console.log(`[Transcribe Route] Successfully refunded ${creditsPreDeducted} credits to user ${userId}`);
        } catch (err) {
          console.error('[Transcribe Route] Error auto-refunding credits:', err);
        }
      }
    };

    if (supabase && userId) {
      // 2.1 Credit Mode: Pre-deduct credit atomically via RPC (Locks row & deducts)
      if (mode === 'credits') {
        const neededCredits = calculateCreditUsage(clientDuration);
        const { error: deductErr } = await supabase.rpc('deduct_user_credits', {
          p_user_id: userId,
          p_minutes: neededCredits,
          p_description: `ถอดเสียงคลิปวิดีโอ (${neededCredits} นาที)`,
        });

        if (deductErr) {
          console.warn('[Transcribe Route] deduct_user_credits error:', deductErr.message);
          return NextResponse.json(
            {
              error: `เครดิตคงเหลือไม่เพียงพอสำหรับการถอดเสียง (${neededCredits} นาที) กรุณาเติมเครดิตเพื่อใช้งานต่อค่ะ`,
            },
            { status: 402 }
          );
        }
        creditsPreDeducted = neededCredits;
      }

      // 2.2 Google Free Mode: Consume monthly quota (5 clips / month)
      if (mode === 'google_free') {
        const { data: quotaRes } = await supabase.rpc('consume_google_free_quota', { p_user_id: userId });
        const firstRow = Array.isArray(quotaRes) ? quotaRes[0] : quotaRes;
        if (firstRow && firstRow.allowed === false) {
          return NextResponse.json({ error: firstRow.message }, { status: 429 });
        }
      }

      // 2.3 Groq Free Mode: Consume daily quota (3 clips / day)
      if (mode === 'groq_free') {
        const { data: quotaRes } = await supabase.rpc('consume_groq_free_quota', { p_user_id: userId });
        const firstRow = Array.isArray(quotaRes) ? quotaRes[0] : quotaRes;
        if (firstRow && firstRow.allowed === false) {
          return NextResponse.json({ error: firstRow.message }, { status: 429 });
        }
      }
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
      await refundCreditsIfFailed();
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
        await refundCreditsIfFailed();
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
        await refundCreditsIfFailed();
        const errText = await groqRes.text();
        return NextResponse.json({ error: `Groq Whisper Error: ${errText}` }, { status: groqRes.status });
      }

      const groqData = await groqRes.json();
      const rawWords: TranscribedWord[] = (groqData.words || []).map((w: { word: string; start: number; end: number }) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: 0.95,
      }));

      // Run AI Auto-Correction (Post-Processing with Gemini Flash)
      const corrected = await correctThaiWordsWithLLM(rawWords, groqData.text || '');

      // Record safety budget usage for free tier
      await recordSafetyBudgetUsage('groq', isPaidUser);

      return NextResponse.json({
        success: true,
        text: corrected.text,
        duration: corrected.words.length > 0 ? corrected.words[corrected.words.length - 1].end : 0,
        language: groqData.language || 'th',
        segments: groqData.segments || [],
        words: corrected.words,
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
      await refundCreditsIfFailed();
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
                    'Type-C', 'USB-C', 'USB Type-C', 'USB-A', 'Type-A', 'Lightning', 'Micro USB',
                    'สายชาร์จ', 'หัวชาร์จ', 'เก้าสิบองศา', 'เล่นเกม', 'จ่ายไฟ', 'วัตต์', 'แอมป์', 'โวลต์',
                    'ฟาสต์ชาร์จ', 'พาวเวอร์แบงค์', 'แนะนำ', 'รีวิว', 'คลิปนี้', 'สวัสดีครับ', 'สวัสดีค่ะ',
                    'ตัวนี้', 'อันนี้', 'แบบนี้', 'ราคา', 'โปรโมชั่น', 'ส่งฟรี', 'ของแท้', 'ประกัน',
                    'สักเส้นนึง', 'ความยาว', 'ทนทาน', 'ชาร์จไว', 'ชาร์จเร็ว', 'ตัวเนี้ย', 'เล่นเกมไปด้วย',
                    '60W', '100W', '240W', 'Fast Charge', 'Power Bank', 'Adapter', 'iPhone', 'iPad', 'Kimiso'
                  ],
                  boost: 20.0,
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
        await refundCreditsIfFailed();
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

      // Record safety budget usage for free tier
      await recordSafetyBudgetUsage('google', isPaidUser);

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
