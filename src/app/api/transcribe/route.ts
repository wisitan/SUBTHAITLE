import { NextRequest, NextResponse } from 'next/server';
import {
  getSupabaseAdmin,
  calculateCreditUsage,
} from '@/services/billing/quota';
import { transcribeAudioBuffer } from '@/services/ai';

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

    // Mode validation
    if (mode === 'free' || mode === 'groq_free' || mode === 'google_free') {
      // Free mode limit: max 2 minutes (125s)
      if (clientDuration > 125) {
        return NextResponse.json(
          {
            error:
              'คลิปวิดีโอมีความยาวเกิน 2 นาทีสำหรับโหมดใช้งานฟรี กรุณาเลือกโหมด "Credit ที่มี" เพื่อถอดเสียงคลิปยาวค่ะ',
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
      }
    } else if (mode === 'credits') {
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
      });

      return NextResponse.json({
        success: true,
        text: result.text,
        duration: result.duration,
        language: result.language,
        words: result.words,
      });
    } catch (sttError) {
      await refundCreditsIfFailed();
      console.error('[Transcribe Route STT Error]:', sttError);
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
