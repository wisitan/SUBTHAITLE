import { NextRequest, NextResponse } from 'next/server';
import {
  getSupabaseAdmin,
  calculateCreditUsage,
} from '@/services/billing/quota';
import { transcribeAudioBuffer } from '@/services/ai';
import { getDailySystemUsage, incrementDailySystemUsage } from '../system/quota/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s max execution time for Vercel functions

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('file') as Blob | null;
    const language = (formData.get('language') as string) || 'th';
    const userId = (formData.get('userId') as string) || null;
    const mode = (formData.get('mode') as string) || 'free';
    const clientDuration = parseFloat((formData.get('duration') as string) || '0');
    const customProvider = (formData.get('provider') as string) || undefined;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'ไม่พบไฟล์เสียงในคำร้องขอ (No audio file provided)' },
        { status: 400 }
      );
    }

    // 1. Quota & Credit Validation (Supabase integration)
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
          console.log(`[Transcribe Route] Auto-refunded ${creditsPreDeducted} credits to user ${userId}`);
        } catch (err) {
          console.error('[Transcribe Route] Error auto-refunding credits:', err);
        }
      }
    };

    let usedQuotaCount: number | undefined = undefined;
    let remainingQuota: number | undefined = undefined;

    // Mode validation
    if (mode === 'free' || mode === 'groq_free' || mode === 'google_free') {
      // 1. Check Global System-Wide Daily Limit (500 clips / day)
      const systemUsage = getDailySystemUsage();
      if (systemUsage.isExhausted) {
        return NextResponse.json(
          {
            error:
              '⚠️ โควต้าฟรีประจำวันของระบบครบกำหนดแล้วค่ะ (รีเซ็ตทุกเที่ยงคืน) กรุณาเลือกโหมด "Credit ที่มี" หรือเติมเครดิตเพื่อถอดเสียงได้ทันทีค่ะ',
          },
          { status: 429 }
        );
      }

      // 2. Free mode duration limit: max 2 minutes (125s)
      if (clientDuration > 125) {
        return NextResponse.json(
          {
            error:
              'คลิปวิดีโอมีความยาวเกิน 2 นาทีสำหรับโหมดใช้งานฟรี กรุณาเลือกโหมด "โควต้าผู้สนับสนุน" เพื่อถอดเสียงคลิปยาวค่ะ',
          },
          { status: 400 }
        );
      }

      if (supabase && userId) {
        const { data: quotaRes } = await supabase.rpc('consume_groq_free_quota', { p_user_id: userId });
        const firstRow = Array.isArray(quotaRes) ? quotaRes[0] : quotaRes;
        if (firstRow && firstRow.allowed === false) {
          return NextResponse.json({ error: firstRow.message }, { status: 429 });
        }
        if (firstRow && typeof firstRow.count === 'number') {
          usedQuotaCount = firstRow.count;
          remainingQuota = Math.max(0, 5 - firstRow.count);
        }
      }

      // Track global free usage
      incrementDailySystemUsage();
    } else if (mode === 'credits') {
      // 1. Credits mode duration limit: max 30 minutes (1830s)
      if (clientDuration > 1830) {
        return NextResponse.json(
          {
            error:
              'คลิปวิดีโอมีความยาวเกิน 30 นาทีซึ่งเป็นขีดจำกัดสูงสุดต่อคลิปของระบบ กรุณาตัดแบ่งคลิปเป็นช่วงไม่เกิน 30 นาทีนะคะ',
          },
          { status: 400 }
        );
      }

      const neededCredits = calculateCreditUsage(clientDuration);
      if (supabase && userId) {
        const { error: deductErr } = await supabase.rpc('deduct_user_credits', {
          p_user_id: userId,
          p_minutes: neededCredits,
          p_description: `ถอดเสียงคลิปวิดีโอ (${neededCredits} นาที)`,
        });

        if (deductErr) {
          return NextResponse.json(
            {
              error: `เครดิตคงเหลือไม่เพียงพอสำหรับการถอดเสียง (${neededCredits} นาที) กรุณาเติมเครดิตเพื่อใช้งานต่อค่ะ`,
            },
            { status: 402 }
          );
        }
        creditsPreDeducted = neededCredits;
      }
    }

    // 2. Transcribe Audio via STT Provider Hub
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    try {
      const result = await transcribeAudioBuffer(audioBuffer, {
        provider: customProvider,
        language,
        mode,
      });

      return NextResponse.json({
        success: true,
        text: result.text,
        duration: result.duration,
        language: result.language,
        words: result.words,
        usedQuotaCount,
        remainingQuota,
      });
    } catch (sttError: unknown) {
      await refundCreditsIfFailed();
      console.error('[Transcribe Route STT Error]:', sttError);

      const errObj = sttError && typeof sttError === 'object' ? (sttError as Record<string, unknown>) : null;
      const errMsg = sttError instanceof Error ? sttError.message : String(sttError);

      const isRateLimit = Boolean(
        errObj?.isRateLimit ||
        errObj?.status === 429 ||
        errMsg.includes('GEMINI_RATE_LIMIT_EXCEEDED') ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED')
      );

      if (isRateLimit) {
        return NextResponse.json(
          {
            error: 'RATE_LIMIT_EXCEEDED',
            isRateLimit: true,
            retryAfter: mode === 'credits' ? 5 : 15,
            message:
              mode === 'credits'
                ? 'ช่องสัญญาณระบบกำลังรอคิวชั่วคราว ระบบจะลองส่งซ้ำให้อัตโนมัติค่ะ'
                : 'ช่องสัญญาณใช้งานฟรีกำลังหนาแน่น (จำกัด 15 ครั้ง/นาที) ระบบกำลังรอคิวส่งซ้ำให้อัตโนมัติค่ะ',
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error:
            sttError instanceof Error
              ? sttError.message
              : 'เกิดข้อผิดพลาดในการถอดเสียงด้วย AI',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Transcribe Route Exception]:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุในการประมวลผล',
      },
      { status: 500 }
    );
  }
}
