import { NextRequest, NextResponse } from 'next/server';

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_REQUESTS_PER_IP_PER_DAY = 5; // 5 transcriptions per IP/day max
const MAX_GLOBAL_REQUESTS_PER_DAY = 200;

// Initialize Upstash Redis if environment variables are provided
let ipLimiter: Ratelimit | null = null;
let globalLimiter: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    ipLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(MAX_REQUESTS_PER_IP_PER_DAY, '1 d'),
      prefix: 'subthaitle:ip',
    });

    globalLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(MAX_GLOBAL_REQUESTS_PER_DAY, '1 d'),
      prefix: 'subthaitle:global',
    });
  } catch (err) {
    console.warn('Failed to initialize Upstash Redis ratelimiter:', err);
  }
}

// In-memory fallback sliding rate limiter for local dev / environments without Redis
const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();
let globalRequestCount = 0;
let globalResetAt = Date.now() + 24 * 60 * 60 * 1000;

async function checkRateLimits(ip: string): Promise<{ allowed: boolean; reason?: string }> {
  // If Redis is configured, use Upstash sliding window rate limiting
  if (globalLimiter && ipLimiter) {
    try {
      const [globalResult, ipResult] = await Promise.all([
        globalLimiter.limit('global_transcribe_usage'),
        ipLimiter.limit(ip),
      ]);

      if (!globalResult.success) {
        return {
          allowed: false,
          reason: 'โควต้าฟรีรวมของเซิร์ฟเวอร์ประจำวันเต็มแล้วค่ะ เพื่อป้องกันค่าใช้จ่ายเกินลิมิต กรุณาใส่ Groq API Key ของตัวเอง (BYOK) หรือรัน Local Whisper เพื่อใช้งานต่อ',
        };
      }

      if (!ipResult.success) {
        return {
          allowed: false,
          reason: `โควต้าการใช้งานฟรีประจำวันของคุณครบ ${MAX_REQUESTS_PER_IP_PER_DAY} คลิปแล้วค่ะ กรุณาร่วมสนับสนุน หรือใส่ Groq API Key ของตัวเอง (BYOK) เพื่อใช้งานแบบไม่จำกัด`,
        };
      }

      return { allowed: true };
    } catch (err) {
      console.warn('Redis rate limit check error, falling back to memory:', err);
    }
  }

  // In-memory fallback
  const now = Date.now();

  // Reset global counter if 24h passed
  if (now > globalResetAt) {
    globalRequestCount = 0;
    globalResetAt = now + 24 * 60 * 60 * 1000;
    ipRequestCounts.clear();
  }

  // Check global budget first
  if (globalRequestCount >= MAX_GLOBAL_REQUESTS_PER_DAY) {
    return {
      allowed: false,
      reason: 'โควต้าฟรีรวมของเซิร์ฟเวอร์ประจำวันเต็มแล้วค่ะ เพื่อป้องกันค่าใช้จ่ายเกินลิมิต กรุณาใส่ Groq API Key ของตัวเอง (BYOK) หรือรัน Local Whisper เพื่อใช้งานต่อ',
    };
  }

  // Check IP specific limit
  const record = ipRequestCounts.get(ip);
  if (!record || now > record.resetAt) {
    ipRequestCounts.set(ip, {
      count: 1,
      resetAt: now + 24 * 60 * 60 * 1000,
    });
    globalRequestCount++;
    return { allowed: true };
  }

  if (record.count >= MAX_REQUESTS_PER_IP_PER_DAY) {
    return {
      allowed: false,
      reason: `โควต้าการใช้งานฟรีประจำวันของคุณครบ ${MAX_REQUESTS_PER_IP_PER_DAY} คลิปแล้วค่ะ กรุณาร่วมสนับสนุน หรือใส่ Groq API Key ของตัวเอง (BYOK) เพื่อใช้งานแบบไม่จำกัด`,
    };
  }

  record.count += 1;
  globalRequestCount++;
  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    // 1. Check IP and Global rate limits for abuse prevention
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

    const limitCheck = await checkRateLimits(clientIp);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: limitCheck.reason,
        },
        { status: 429 }
      );
    }

    // 2. Check Server API Key
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      return NextResponse.json(
        {
          error:
            'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า GROQ_API_KEY กรุณาใส่ API Key ในโหมด BYOK หรือตั้งค่าบน Vercel Environment Variables',
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get('file') as Blob | null;
    const language = (formData.get('language') as string) || 'th';
    const model = (formData.get('model') as string) || 'whisper-large-v3';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'ไม่พบไฟล์เสียงในคำร้องขอ (No audio file provided)' },
        { status: 400 }
      );
    }

    // 3. Payload size check (Vercel Serverless Function limit = 4.5MB)
    const MAX_SERVER_AUDIO_BYTES = 4.2 * 1024 * 1024;
    if (audioFile.size > MAX_SERVER_AUDIO_BYTES) {
      return NextResponse.json(
        {
          error:
            'ขนาดไฟล์เสียงเกิน 4MB สำหรับเซิร์ฟเวอร์ฟรี กรุณาใช้โหมด BYOK (ใส่ API Key ตัวเอง) เพื่อถอดเสียงไฟล์ขนาดใหญ่ได้ไม่จำกัด',
        },
        { status: 413 }
      );
    }

    // 4. Prepare FormData for Groq API
    const groqFormData = new FormData();
    groqFormData.append('file', audioFile, 'audio.mp3');
    groqFormData.append('model', model);
    groqFormData.append('response_format', 'verbose_json');
    groqFormData.append('language', language);
    groqFormData.append('temperature', '0.0');
    groqFormData.append('prompt', 'ตัดคำภาษาไทย เว้นวรรคตามหลักภาษาอย่างเป็นธรรมชาติ ซับไตเติลภาษาไทย');
    groqFormData.append('timestamp_granularities[]', 'word');
    groqFormData.append('timestamp_granularities[]', 'segment');

    const groqResponse = await fetch(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: groqFormData,
      }
    );

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('[Groq API Error]:', groqResponse.status, errorText);

      let errorMessage = `Groq API Error (${groqResponse.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        // Fallback
      }

      if (groqResponse.status === 429) {
        return NextResponse.json(
          {
            error:
              'โควต้าเซิร์ฟเวอร์ระบบกำลังเต็มชั่วคราว (Rate Limit) กรุณารอสักครู่แล้วลองใหม่ หรือใส่ API Key ตัวเอง (BYOK) เพื่อถอดเสียงได้ทันที',
          },
          { status: 429 }
        );
      }

      return NextResponse.json({ error: errorMessage }, { status: groqResponse.status });
    }

    const result = await groqResponse.json();

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
