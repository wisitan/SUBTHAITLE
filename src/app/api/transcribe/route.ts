import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('file') as Blob | null;
    const language = (formData.get('language') as string) || 'th';
    const userId = (formData.get('userId') as string) || null;
    const userTier = (formData.get('tier') as string) || 'free';

    const isPaidUser = userTier === 'tier_99' || userTier === 'tier_299';

    // Identifier: Use userId if logged in, otherwise client IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';
    const rateLimitIdentifier = userId ? `user:${userId}` : `ip:${clientIp}`;

    // 1. Check Rate Limits
    const limitCheck = await checkRateLimits(rateLimitIdentifier, isPaidUser);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.reason }, { status: 429 });
    }

    // 2. Transcribe using OpenAI Whisper-1 (The Ultimate Accuracy for Thai)
    let apiUrl = 'https://api.openai.com/v1/audio/transcriptions';
    let apiKey = process.env.OPENAI_API_KEY;
    let targetModel = 'whisper-1';

    // Fallback to Groq only if OpenAI key is missing on the server
    if (!apiKey && process.env.GROQ_API_KEY) {
      apiUrl = 'https://api.groq.com/openai/v1/audio/transcriptions';
      apiKey = process.env.GROQ_API_KEY;
      targetModel = 'whisper-large-v3';
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า OPENAI_API_KEY กรุณาตั้งค่าบน Vercel หรือใส่ API Key ในโหมด BYOK เพื่อใช้งาน',
        },
        { status: 500 }
      );
    }

    if (!audioFile) {
      return NextResponse.json(
        { error: 'ไม่พบไฟล์เสียงในคำร้องขอ (No audio file provided)' },
        { status: 400 }
      );
    }

    // 3. Payload size check (Vercel Serverless Function limit = 4.5MB)
    // Note: OpenAI limits to 25MB, Groq limits to 25MB, but Vercel limits HTTP payload to 4.5MB
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

    // 4. Prepare FormData for API
    const apiFormData = new FormData();
    apiFormData.append('file', audioFile, 'audio.mp3');
    apiFormData.append('model', targetModel);
    apiFormData.append('response_format', 'verbose_json');
    apiFormData.append('language', language);
    apiFormData.append('temperature', '0.2');
    apiFormData.append('prompt', 'สวัสดีครับ นี่คือคำบรรยายวิดีโอภาษาไทย');
    
    // สำคัญ: OpenAI อนุญาตให้ส่ง timestamp_granularities[] ได้เหมือนกันเพื่อขอระดับคำ
    apiFormData.append('timestamp_granularities[]', 'word');
    apiFormData.append('timestamp_granularities[]', 'segment');

    const apiResponse = await fetch(
      apiUrl,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: apiFormData,
      }
    );

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('[STT API Error]:', apiResponse.status, errorText);

      let errorMessage = `STT API Error (${apiResponse.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        // Fallback
      }

      if (apiResponse.status === 429) {
        return NextResponse.json(
          {
            error:
              'โควต้าเซิร์ฟเวอร์ระบบกำลังเต็มชั่วคราว (Rate Limit) กรุณารอสักครู่แล้วลองใหม่ หรือใส่ API Key ตัวเอง (BYOK) เพื่อถอดเสียงได้ทันที',
          },
          { status: 429 }
        );
      }

      return NextResponse.json({ error: errorMessage }, { status: apiResponse.status });
    }

    const result = await apiResponse.json();

    return NextResponse.json({
      success: true,
      text: result.text || '',
      duration: result.duration || 0,
      language: result.language || 'th',
      segments: result.segments || [],
      words: result.words || [],
    });
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
