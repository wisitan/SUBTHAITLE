import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In-memory sliding rate limiter for IP protection (Free tier)
const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS_PER_DAY = 10; // 10 transcriptions per IP/day max for public endpoint

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRequestCounts.get(ip);

  if (!record || now > record.resetAt) {
    ipRequestCounts.set(ip, {
      count: 1,
      resetAt: now + 24 * 60 * 60 * 1000, // 24 hours
    });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_DAY) {
    return false;
  }

  record.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Check IP rate limit for abuse prevention
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

    if (!checkIpRateLimit(clientIp)) {
      return NextResponse.json(
        {
          error:
            'โควต้าการใช้งานฟรีประจำวันสำหรับเครื่องของคุณเต็มแล้วค่ะ (จำกัด 5-10 คลิป/วัน) กรุณาร่วมสนับสนุนเพื่อปลดล็อกไม่จำกัด หรือใส่ Groq API Key ของตัวเอง (BYOK)',
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
