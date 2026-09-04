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
    const attempt = parseInt((formData.get('attempt') as string) || '1', 10);

    if (!audioFile) {
      return NextResponse.json(
        { error: 'ไม่พบไฟล์เสียงในคำร้องขอ (No audio file provided)' },
        { status: 400 }
      );
    }

    // 1. Quota & Credit Validation (Supabase integration)
    const supabase = getSupabaseAdmin();
    let usedQuotaCount: number | undefined = undefined;
    let remainingQuota: number | undefined = undefined;
    let neededCredits = 0;

    // Mode validation & Pre-checks (READ-ONLY: DO NOT DEDUCT BEFORE TRANSCRIPTION SUCCEEDS)
    if (mode === 'free' || mode === 'groq_free' || mode === 'google_free') {
      // 1. Anti-abuse guard: Require login even for free tier
      if (!userId) {
        return NextResponse.json(
          { error: 'กรุณาเข้าสู่ระบบด้วย Google ก่อนใช้งานโหมดฟรีค่ะ' },
          { status: 401 }
        );
      }

      // 2. Check Global System-Wide Daily Limit (1,500 clips / day)
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

      // 3. Free mode duration limit: max 2 minutes (125s)
      if (clientDuration > 125) {
        return NextResponse.json(
          {
            error:
              'คลิปวิดีโอมีความยาวเกิน 2 นาทีสำหรับโหมดใช้งานฟรี กรุณาเลือกโหมด "โควต้าผู้สนับสนุน" เพื่อถอดเสียงคลิปยาวสูงสุด 30 นาที หรือตัดแบ่งคลิปก่อนค่ะ',
          },
          { status: 400 }
        );
      }
    } else if (mode === 'credits') {
      if (!userId) {
        return NextResponse.json(
          { error: 'กรุณาเข้าสู่ระบบเพื่อใช้งานโหมดโควต้าผู้สนับสนุนค่ะ' },
          { status: 401 }
        );
      }

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

      neededCredits = calculateCreditUsage(clientDuration);
      if (supabase) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('credits_minutes')
            .eq('id', userId)
            .maybeSingle();

          if (!profile || (profile.credits_minutes ?? 0) < neededCredits) {
            return NextResponse.json(
              {
                error: `เครดิตคงเหลือไม่เพียงพอสำหรับการถอดเสียง (${neededCredits} นาที) กรุณาเติมเครดิตเพื่อใช้งานต่อค่ะ`,
              },
              { status: 402 }
            );
          }
        } catch (creditCheckErr) {
          console.warn('[Transcribe Route] Credit pre-check warning:', creditCheckErr);
        }
      }
    }

    // 2. Transcribe Audio via STT Provider Hub
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    try {
      const result = await transcribeAudioBuffer(audioBuffer, {
        provider: customProvider,
        language,
        mode,
        duration: clientDuration,
        attempt,
      });

      // 3. Post-Transcription Deductions: ONLY deduct quota or credits after AI delivers the goods!
      if (mode === 'free' || mode === 'groq_free' || mode === 'google_free') {
        if (supabase && userId) {
          try {
            const { data: quotaRes } = await supabase.rpc('consume_groq_free_quota', { p_user_id: userId });
            const firstRow = Array.isArray(quotaRes) ? quotaRes[0] : quotaRes;
            if (firstRow && typeof firstRow.count === 'number') {
              usedQuotaCount = firstRow.count;
              remainingQuota = 999; // Unlimited free clips
            }
          } catch (quotaDeductErr) {
            console.error('[Transcribe Route] Error consuming free quota on success:', quotaDeductErr);
          }
        }
        incrementDailySystemUsage();
      } else if (mode === 'credits' && neededCredits > 0) {
        if (supabase && userId) {
          try {
            await supabase.rpc('deduct_user_credits', {
              p_user_id: userId,
              p_minutes: neededCredits,
              p_description: `ถอดเสียงคลิปวิดีโอ (${neededCredits} นาที)`,
            });
          } catch (creditDeductErr) {
            console.error('[Transcribe Route] Error deducting user credits on success:', creditDeductErr);
          }
        }
      }

      return NextResponse.json({
        success: true,
        text: result.text,
        duration: result.duration,
        language: result.language,
        words: result.words,
        provider: result.provider || 'gemini',
        model: result.model || 'gemini-3.8-flash',
        providerFallback: result.providerFallback,
        usedQuotaCount,
        remainingQuota,
      });
    } catch (sttError: unknown) {
      // NOTE: No credits or free quotas were pre-deducted, so NO refund needed!
      // The user NEVER loses quota or credit on failed attempts or retries.
      console.error('[Transcribe Route STT Error]:', sttError);

      const errObj = sttError && typeof sttError === 'object' ? (sttError as Record<string, unknown>) : null;
      const errMsg = sttError instanceof Error ? sttError.message : String(sttError);

      const isRateLimit = Boolean(
        errObj?.isRateLimit ||
        errObj?.status === 429 ||
        errObj?.status === 503 ||
        errMsg.includes('GEMINI_RATE_LIMIT_EXCEEDED') ||
        errMsg.includes('429') ||
        errMsg.includes('503') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('high demand') ||
        errMsg.includes('UNAVAILABLE')
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
                : 'ช่องสัญญาณใช้งานฟรีกำลังหนาแน่น (จำกัด 15 ครั้ง/นาที หรือระบบกำลังประมวลผลสูง) ระบบกำลังรอคิวส่งซ้ำให้อัตโนมัติค่ะ',
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
