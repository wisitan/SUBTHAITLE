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

// 📚 Dynamic Dictionary & Auto-Learned Phrases Loader
async function getDynamicCustomDictionary(): Promise<{ phrases: string[]; rulesText: string }> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return { phrases: [], rulesText: '' };

    const { data } = await supabase
      .from('custom_dictionary')
      .select('wrong_word, correct_word')
      .limit(100);

    if (!data || data.length === 0) return { phrases: [], rulesText: '' };

    const phrases = Array.from(new Set(data.map((d) => d.correct_word).filter(Boolean)));
    const rules = data
      .filter((d) => d.wrong_word && d.correct_word)
      .map((d) => `- "${d.wrong_word}" → "${d.correct_word}"`);

    const rulesText = rules.length > 0 ? `\n\n【AUTO-LEARNED & CUSTOM RULES】\n${rules.join('\n')}` : '';
    return { phrases, rulesText };
  } catch {
    return { phrases: [], rulesText: '' };
  }
}

// 🧠 Direct Gemini Multimodal Transcription Engine with Syllable-Weighted Acoustic Alignment
interface SubtitleSegment {
  start: number;
  end: number;
  text: string;
  words?: TranscribedWord[];
}

interface AcousticWord {
  word: string;
  start: number;
  end: number;
}

// ⚡ Worker 1: Extract Real Acoustic WORD Boundaries from Whisper (VAD / Speech Energy boundaries)
async function fetchWhisperAcousticWords(audioBuffer: Buffer, language: string = 'th'): Promise<AcousticWord[] | null> {
  const groqApiKey = (process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || '').trim();
  const openAiApiKey = (process.env.OPENAI_API_KEY || '').trim();

  // 1. Try OpenAI Whisper API directly (since it supports timestamp_granularities="word")
  if (openAiApiKey) {
    try {
      const openAiBlob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/mp3' });
      const openAiForm = new FormData();
      openAiForm.append('file', openAiBlob, 'audio.mp3');
      openAiForm.append('model', 'whisper-1');
      openAiForm.append('response_format', 'verbose_json');
      openAiForm.append('language', language === 'th' ? 'th' : language);
      openAiForm.append('temperature', '0.0');
      openAiForm.append('timestamp_granularities[]', 'word'); // REQUIRED FOR EXACT SILENCE GAPS

      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openAiApiKey}` },
        signal: AbortSignal.timeout(6000),
        body: openAiForm,
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.words) && data.words.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return data.words.map((w: any) => ({
            word: w.word,
            start: parseFloat(w.start),
            end: parseFloat(w.end)
          }));
        }
      }
    } catch (err) {
      console.warn('[Whisper Acoustic Words OpenAI Warning]:', err);
    }
  }

  // 2. Fallback to Groq if OpenAI fails/missing (Groq doesn't perfectly support words yet, but we can fake it from segments)
  if (groqApiKey) {
    try {
      const groqBlob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/mp3' });
      const groqForm = new FormData();
      groqForm.append('file', groqBlob, 'audio.mp3');
      groqForm.append('model', 'whisper-large-v3');
      groqForm.append('response_format', 'verbose_json');
      groqForm.append('language', language === 'th' ? 'th' : language);
      groqForm.append('temperature', '0.0');

      const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqApiKey}` },
        signal: AbortSignal.timeout(6000),
        body: groqForm,
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.segments) && data.segments.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return data.segments.map((s: any) => ({
            word: s.text,
            start: parseFloat(s.start),
            end: parseFloat(s.end)
          }));
        }
      }
    } catch (err) {
      console.warn('[Whisper Acoustic Words Groq Warning]:', err);
    }
  }

  return null;
}

// 🎯 THE ULTIMATE DTW-STYLE BURST MAPPER (Just like Competitors)
// Maps Gemini's perfect text onto STT's exact word timings. PRESERVES SILENCE GAPS 100%!
function mapPerfectTextToAcousticWords(
  geminiResult: { text: string; words: TranscribedWord[]; segments: SubtitleSegment[]; duration: number },
  acousticWords: AcousticWord[]
): { text: string; words: TranscribedWord[]; segments: SubtitleSegment[]; duration: number } {
  if (!geminiResult.words || geminiResult.words.length === 0 || !acousticWords || acousticWords.length === 0) {
    return geminiResult;
  }

  const perfectWords = geminiResult.words.map(w => w.word);
  const perfectWeights = perfectWords.map(w => Math.max(1, w.length));
  const totalPerfectWeight = perfectWeights.reduce((a, b) => a + b, 0);

  // Group acoustic words into Continuous Speech Bursts (Silence > 0.3s creates a gap!)
  const bursts: { start: number; end: number; duration: number }[] = [];
  let curBurst = { start: acousticWords[0].start, end: acousticWords[0].end };
  
  for (let i = 1; i < acousticWords.length; i++) {
    const aw = acousticWords[i];
    if (aw.start - curBurst.end > 0.3) {
      bursts.push({ ...curBurst, duration: curBurst.end - curBurst.start });
      curBurst = { start: aw.start, end: aw.end };
    } else {
      curBurst.end = Math.max(curBurst.end, aw.end);
    }
  }
  bursts.push({ ...curBurst, duration: curBurst.end - curBurst.start });

  const totalAcousticDuration = bursts.reduce((acc, b) => acc + Math.max(0.1, b.duration), 0);

  const finalWords: TranscribedWord[] = [];
  let currentBurstIdx = 0;
  let currentBurstOffset = 0;

  for (let i = 0; i < perfectWords.length; i++) {
    const pWord = perfectWords[i];
    const weightProp = perfectWeights[i] / Math.max(1, totalPerfectWeight);
    const neededDuration = weightProp * totalAcousticDuration;

    const curB = bursts[currentBurstIdx];
    const wStart = curB.start + currentBurstOffset;
    const remainingInBurst = curB.end - wStart;
    
    let wEnd: number;
    if (neededDuration <= remainingInBurst || currentBurstIdx === bursts.length - 1) {
      wEnd = wStart + Math.min(neededDuration, remainingInBurst);
      currentBurstOffset += (wEnd - wStart);
      if (currentBurstOffset >= curB.duration - 0.05 && currentBurstIdx < bursts.length - 1) {
        currentBurstIdx++;
        currentBurstOffset = 0;
      }
    } else {
      wEnd = curB.end;
      currentBurstIdx++;
      currentBurstOffset = 0;
    }

    finalWords.push({
      word: pWord,
      start: parseFloat(wStart.toFixed(2)),
      end: parseFloat(wEnd.toFixed(2)),
      confidence: 0.98
    });
  }

  // Group mapped words back into Mobile-friendly Segments (3-5 words each)
  const finalSegments: SubtitleSegment[] = [];
  let currentSegWords: TranscribedWord[] = [];
  
  for (let i = 0; i < finalWords.length; i++) {
    const fw = finalWords[i];
    currentSegWords.push(fw);
    
    const isPause = i < finalWords.length - 1 && finalWords[i+1].start - fw.end > 0.4;
    if (currentSegWords.length >= 5 || isPause) {
      finalSegments.push({
        start: currentSegWords[0].start,
        end: currentSegWords[currentSegWords.length - 1].end,
        text: currentSegWords.map(w => w.word).join(''),
        words: [...currentSegWords]
      });
      currentSegWords = [];
    }
  }
  if (currentSegWords.length > 0) {
    finalSegments.push({
      start: currentSegWords[0].start,
      end: currentSegWords[currentSegWords.length - 1].end,
      text: currentSegWords.map(w => w.word).join(''),
      words: currentSegWords
    });
  }

  return {
    text: geminiResult.text,
    duration: finalWords.length > 0 ? finalWords[finalWords.length - 1].end : geminiResult.duration,
    segments: finalSegments,
    words: finalWords,
  };
}
function computeSyllableWeightedWords(
  segText: string,
  segStart: number,
  segEnd: number,
  rawWordsList: Array<string | { word?: string; start?: number | string; end?: number | string }>
): TranscribedWord[] {
  const duration = Math.max(0.2, segEnd - segStart);
  const wordsList = rawWordsList
    .map((w) => (typeof w === 'string' ? w : w.word || ''))
    .filter((w) => w.trim().length > 0);

  if (wordsList.length === 0) {
    return [{ word: segText, start: segStart, end: segEnd, confidence: 0.98 }];
  }

  // Calculate weights based on Thai characters + english length
  const weights = wordsList.map((w) => Math.max(1, w.length));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let currentStart = segStart;
  return wordsList.map((w, idx) => {
    const proportion = weights[idx] / Math.max(1, totalWeight);
    const wordDuration = duration * proportion;
    const wStart = parseFloat(currentStart.toFixed(2));
    const wEnd = parseFloat((currentStart + wordDuration).toFixed(2));
    currentStart = wEnd;

    return {
      word: w,
      start: wStart,
      end: wEnd,
      confidence: 0.98,
    };
  });
}

async function transcribeWithGeminiDirect(
  audioBase64: string,
  language: string = 'th',
  extraRulesText: string = ''
): Promise<{ text: string; words: TranscribedWord[]; segments: SubtitleSegment[]; duration: number } | null> {
  const geminiApiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    ''
  ).trim();

  if (!geminiApiKey) return null;

  const systemPrompt = `You are the world's most accurate Thai speech transcription and subtitle segmentation engine for video content (Shorts, TikTok, YouTube Reviews, Tech Gadgets, Lifestyle).

TASK:
Listen carefully to the audio file and transcribe the exact spoken Thai speech with natural conversational phrasing, 100% correct Thai spelling, and accurate English loanwords/brands/slang (e.g. Type-C, USB-C, Power Bank, Fast Charge, iPhone, iPad, Adapter, 60W, 100W, Vibe Coding, Affiliate, Kimiso).

CRITICAL PHONETIC & ANTI-HALLUCINATION RULES:
1. STRICTLY PREFER NATIVE THAI VOCABULARY OVER ENGLISH:
   - When the speaker is speaking native Thai words, NEVER hallucinate or phonetically convert them into random English words.
   - Example: "ก็รองรับ" / "รองรับหัว" / "หัวต่อ" / "หลายแบบ" is 100% Thai ("ก็รองรับหัวได้หลายแบบ"), DO NOT transcribe as "android" or "upload" or "download"!
   - Example: "มีทั้งแบบ", "ดึงออกมา", "เสียบใช้งาน", "ปรับได้" are pure Thai phrases.
2. English is ONLY for real tech standards and brands: "Type-C", "USB-C", "USB-A", "Lightning", "60W", "100W", "Fast Charge", "Kimiso", "iPhone", "iPad", "Power Bank", "Adapter".
3. Divide into natural, rhythmic subtitle segments (3 to 7 words per segment, 1.5 - 3.5 seconds each) that read smoothly on mobile screens.
4. For each segment, provide the exact start and end timestamps in seconds (floats with 2 decimals) where the speaker begins and finishes pronouncing that phrase.
5. In each segment, break down into an array of individual Thai words in "words".${extraRulesText}

STRICT JSON OUTPUT SCHEMA:
{
  "text": "Full transcribed text...",
  "duration": 15.5,
  "segments": [
    {
      "start": 0.0,
      "end": 2.5,
      "text": "ก็รองรับหัวได้หลายแบบนะครับ",
      "words": ["ก็รองรับ", "หัว", "ได้", "หลายแบบ", "นะครับ"]
    }
  ]
}`;

  const candidateModels = [
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
  ];

  for (const model of candidateModels) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(7000),
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inline_data: {
                      mime_type: 'audio/mp3',
                      data: audioBase64,
                    },
                  },
                  {
                    text: `Please transcribe this audio clip into timed Thai subtitle segments and words (${language === 'en' ? 'English' : 'Thai'}).`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.0,
            },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (contentText) {
          const parsed = JSON.parse(contentText);
          const rawSegments = Array.isArray(parsed.segments) ? parsed.segments : [];
          const finalSegments: SubtitleSegment[] = [];
          const allWords: TranscribedWord[] = [];

          if (rawSegments.length > 0) {
            for (const seg of rawSegments) {
              const segStart = typeof seg.start === 'number' ? seg.start : parseFloat(String(seg.start)) || 0;
              const segEnd = typeof seg.end === 'number' ? seg.end : parseFloat(String(seg.end)) || segStart + 2.0;
              const segText = String(seg.text || '').trim();
              const rawWords = Array.isArray(seg.words) && seg.words.length > 0 ? seg.words : segText.split(' ').filter(Boolean);

              const segWords = computeSyllableWeightedWords(segText, segStart, segEnd, rawWords);
              allWords.push(...segWords);

              finalSegments.push({
                start: segStart,
                end: segEnd,
                text: segText,
                words: segWords,
              });
            }
          } else if (Array.isArray(parsed.words) && parsed.words.length > 0) {
            for (const w of parsed.words) {
              allWords.push({
                word: String(w.word || ''),
                start: typeof w.start === 'number' ? w.start : parseFloat(String(w.start)) || 0,
                end: typeof w.end === 'number' ? w.end : parseFloat(String(w.end)) || 0,
                confidence: 0.98,
              });
            }
          }

          const fullText = parsed.text || finalSegments.map((s) => s.text).join(' ') || allWords.map((w) => w.word).join(' ');
          const duration = parsed.duration || (allWords.length > 0 ? allWords[allWords.length - 1].end : 0);

          return {
            text: fullText,
            words: allWords,
            segments: finalSegments,
            duration,
          };
        }
      }
    } catch (err) {
      console.warn(`[Gemini Direct Transcribe] Model ${model} failed or timed out:`, err);
    }
  }

  return null;
}

// 🧠 AI Auto-Correction (Post-Processing Engine)
// รองรับ Google Gemini (Flash / Pro) Multimodal Audio Verification เป็นหลัก และ Fallback ไปยัง OpenAI (gpt-4o-mini)
async function correctThaiWordsWithLLM(
  words: TranscribedWord[],
  rawText: string,
  extraRulesText: string = '',
  audioBase64?: string
): Promise<{ words: TranscribedWord[]; text: string }> {
  if (words.length === 0) {
    return { words, text: rawText };
  }

  // Optimize payload: ส่งเฉพาะคำภาษาไทยแบบ string array เพื่อประหยัด Tokens 70%
  const wordStringsInput = words.map((w) => w.word);

  const systemPrompt = `You are the world's most accurate Thai speech subtitle correction engine, specialized in video content (Shorts, TikTok, YouTube Reviews, Tech Gadgets, Cooking, Lifestyle).

TASK: You are provided with the audio file, the raw transcript, and word-level tokens from speech recognition. Listen directly to the audio to verify and fix phonetic errors, sound-alikes, garbled English loanwords, and Thai-specific mistakes using full audio + text context.

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
- Fix known brand misspellings contextually (Samsung, iPhone, iPad, AirPods, Shopee, Lazada, etc.)${extraRulesText}

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

  // 1. Primary Attempt: Google Gemini API (Google AI Studio) with Multimodal Audio Verification
  const geminiApiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    ''
  ).trim();

  if (geminiApiKey) {
    const candidateModels = [
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
    ];

    const userParts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];
    if (audioBase64) {
      userParts.push({
        inline_data: {
          mime_type: 'audio/mp3',
          data: audioBase64,
        },
      });
    }
    userParts.push({ text: userMessage });

    for (const model of candidateModels) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(6000),
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: systemPrompt }],
              },
              contents: [
                {
                  role: 'user',
                  parts: userParts,
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
          continue;
        }
      } catch (err) {
        console.warn(`[Gemini Fallback]: Model ${model} failed, skipping...`, err);
        continue;
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

    // Extract Chunking Metadata
    const chunkIndex = formData.get('chunkIndex') ? parseInt(formData.get('chunkIndex') as string, 10) : 0;
    const isChunkPart = formData.get('isChunkPart') === 'true' || chunkIndex > 0;

    // Deduct credits or consume quota ONLY on chunk 0 or single-file requests (prevents duplicate deductions)
    if (supabase && userId && !isChunkPart) {
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
    if (!isChunkPart && (mode === 'google_free' || mode === 'groq_free') && clientDuration > 125) {
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

    // Convert audio to buffer and base64 for STT and Multimodal AI verification
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const base64Audio = audioBuffer.toString('base64');

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

      const groqBlob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/mp3' });
      const groqForm = new FormData();
      groqForm.append('file', groqBlob, 'audio.mp3');
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

      // Run AI Auto-Correction (Post-Processing with Gemini Flash Multimodal Audio Verification + Dynamic Dictionary Rules)
      const dynamicDict = await getDynamicCustomDictionary();
      const corrected = await correctThaiWordsWithLLM(rawWords, groqData.text || '', dynamicDict.rulesText, base64Audio);

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

    // Route 2: Gemini AI Direct Multimodal Engine with VAD Silence-Gap-Aware Acoustic Interval Mapping
    try {
      // Fetch dynamic custom & auto-learned vocabulary
      const dynamicDict = await getDynamicCustomDictionary();

      // 🎯 Primary Engine: Run Whisper VAD Acoustics + Gemini 100% Thai Transcriber in parallel!
      const [acousticWords, geminiDirectResult] = await Promise.all([
        fetchWhisperAcousticWords(audioBuffer, language),
        transcribeWithGeminiDirect(base64Audio, language, dynamicDict.rulesText),
      ]);

      if (geminiDirectResult && geminiDirectResult.words && geminiDirectResult.words.length > 0) {
        let finalResult = geminiDirectResult;
        if (acousticWords && acousticWords.length > 0) {
          finalResult = mapPerfectTextToAcousticWords(geminiDirectResult, acousticWords);
        }

        // Record safety budget usage for free tier
        await recordSafetyBudgetUsage('google', isPaidUser);

        return NextResponse.json({
          success: true,
          text: finalResult.text,
          duration: finalResult.duration,
          language: language || 'th',
          segments: finalResult.segments || [],
          words: finalResult.words,
        });
      }

      console.warn('[Transcribe Route]: Gemini Direct returned empty or failed, falling back to Google STT...');

      // 🔄 Fallback Engine: Google Cloud Speech-to-Text
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
              'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า Google/Gemini API Key บน Vercel หรือใส่ API Key ในโหมด BYOK เพื่อใช้งาน',
          },
          { status: 500 }
        );
      }

      const basePhrases = [
        'Type-C', 'USB-C', 'USB Type-C', 'USB-A', 'Type-A', 'Lightning', 'Micro USB',
        'สายชาร์จ', 'หัวชาร์จ', 'เก้าสิบองศา', 'เล่นเกม', 'จ่ายไฟ', 'วัตต์', 'แอมป์', 'โวลต์',
        'ฟาสต์ชาร์จ', 'พาวเวอร์แบงค์', 'แนะนำ', 'รีวิว', 'คลิปนี้', 'สวัสดีครับ', 'สวัสดีค่ะ',
        'ตัวนี้', 'อันนี้', 'แบบนี้', 'ราคา', 'โปรโมชั่น', 'ส่งฟรี', 'ของแท้', 'ประกัน',
        'สักเส้นนึง', 'ความยาว', 'ทนทาน', 'ชาร์จไว', 'ชาร์จเร็ว', 'ตัวเนี้ย', 'เล่นเกมไปด้วย',
        '60W', '100W', '240W', 'Fast Charge', 'Power Bank', 'Adapter', 'iPhone', 'iPad', 'Kimiso',
        'ก็รองรับ', 'รองรับ', 'รองรับหัว', 'หลายแบบ', 'หัวต่อ', 'หัวแปลง', 'มีทั้งแบบ'
      ];
      const mergedPhrases = Array.from(new Set([...basePhrases, ...dynamicDict.phrases])).slice(0, 100);

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
                  phrases: mergedPhrases,
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

      // Run AI Auto-Correction (Post-Processing with Gemini Flash Multimodal Audio Verification + Dynamic Dictionary Rules)
      const corrected = await correctThaiWordsWithLLM(words, fullText, dynamicDict.rulesText, base64Audio);

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
