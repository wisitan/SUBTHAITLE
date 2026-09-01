import { NextRequest, NextResponse } from 'next/server';
import {
  getSupabaseAdmin,
  calculateCreditUsage,
  checkSafetyBudget,
  recordSafetyBudgetUsage,
} from '@/services/billing/quota';
import {
  getDynamicCustomDictionary,
  mapPerfectTextToAcousticWords,
  TranscribedWord,
} from '@/services/ai/alignment';
import { fetchWhisperAcousticWords } from '@/services/ai/whisper';
import {
  transcribeWithGeminiDirect,
  correctThaiWordsWithLLM,
} from '@/services/ai/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max execution time for Vercel functions

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

    // Deduct credits or consume quota ONLY on chunk 0 or single-file requests
    if (supabase && userId && !isChunkPart) {
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

      if (mode === 'google_free') {
        const { data: quotaRes } = await supabase.rpc('consume_google_free_quota', { p_user_id: userId });
        const firstRow = Array.isArray(quotaRes) ? quotaRes[0] : quotaRes;
        if (firstRow && firstRow.allowed === false) {
          return NextResponse.json({ error: firstRow.message }, { status: 429 });
        }
      }

      if (mode === 'groq_free') {
        const { data: quotaRes } = await supabase.rpc('consume_groq_free_quota', { p_user_id: userId });
        const firstRow = Array.isArray(quotaRes) ? quotaRes[0] : quotaRes;
        if (firstRow && firstRow.allowed === false) {
          return NextResponse.json({ error: firstRow.message }, { status: 429 });
        }
      }
    }

    // Free Mode 2-Minute Length Check
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

      const dynamicDict = await getDynamicCustomDictionary();
      const corrected = await correctThaiWordsWithLLM(rawWords, groqData.text || '', dynamicDict.rulesText, base64Audio);

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
      const dynamicDict = await getDynamicCustomDictionary();

      // 🎯 Primary Engine: Run Whisper VAD Acoustics + Gemini Multimodal in parallel
      const [acousticWords, geminiDirectResult] = await Promise.all([
        fetchWhisperAcousticWords(audioBuffer, language),
        transcribeWithGeminiDirect(base64Audio, language, dynamicDict.rulesText),
      ]);

      if (geminiDirectResult && geminiDirectResult.words && geminiDirectResult.words.length > 0) {
        let finalResult = geminiDirectResult;
        if (acousticWords && acousticWords.length > 0) {
          finalResult = mapPerfectTextToAcousticWords(geminiDirectResult, acousticWords);
        }

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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: {
              encoding: 'MP3',
              languageCode: language === 'en' ? 'en-US' : 'th-TH',
              enableWordTimeOffsets: true,
              enableAutomaticPunctuation: true,
              useEnhanced: true,
              speechContexts: [{ phrases: mergedPhrases, boost: 20.0 }],
              model: 'default',
            },
            audio: { content: base64Audio },
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

      const corrected = await correctThaiWordsWithLLM(words, fullText, dynamicDict.rulesText, base64Audio);
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
