import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { diffs, userId } = body;

    if (!Array.isArray(diffs) || diffs.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    // Safety limit: max 50 diffs per request
    const validDiffs = diffs.slice(0, 50).filter(
      (d) =>
        d &&
        typeof d.originalPhrase === 'string' &&
        typeof d.correctedPhrase === 'string' &&
        d.originalPhrase.trim().length >= 2 &&
        d.correctedPhrase.trim().length >= 2 &&
        d.originalPhrase.trim() !== d.correctedPhrase.trim()
    );

    if (validDiffs.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      // If Supabase not configured, acknowledge quietly
      return NextResponse.json({ success: true, message: 'Supabase unconfigured' });
    }

    const results = [];

    for (const item of validDiffs) {
      const orig = item.originalPhrase.trim();
      const corr = item.correctedPhrase.trim();
      const ctxBefore = (item.contextBefore || '').trim();
      const ctxAfter = (item.contextAfter || '').trim();

      try {
        // Attempt RPC call first
        const { data, error } = await supabase.rpc('record_correction_feedback', {
          p_original: orig,
          p_corrected: corr,
          p_context_before: ctxBefore,
          p_context_after: ctxAfter,
          p_user_id: userId || null,
        });

        if (!error && data) {
          results.push(data);
        } else {
          // Fallback direct table upsert if RPC is not yet created
          const { data: selectData } = await supabase
            .from('correction_feedback')
            .select('id, vote_count, status')
            .eq('original_phrase', orig)
            .eq('corrected_phrase', corr)
            .maybeSingle();

          if (selectData) {
            const nextCount = (selectData.vote_count || 1) + 1;
            const nextStatus = nextCount >= 2 && selectData.status === 'pending' ? 'auto_learned' : selectData.status;

            await supabase
              .from('correction_feedback')
              .update({
                vote_count: nextCount,
                status: nextStatus,
                context_before: ctxBefore || undefined,
                context_after: ctxAfter || undefined,
                updated_at: new Date().toISOString(),
              })
              .eq('id', selectData.id);

            // Auto-insert into custom_dictionary if threshold reached
            if (nextStatus === 'auto_learned') {
              await supabase.from('custom_dictionary').upsert(
                {
                  wrong_word: orig,
                  correct_word: corr,
                  category: 'auto_learned',
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'wrong_word' }
              );
            }
          } else {
            await supabase.from('correction_feedback').insert([
              {
                original_phrase: orig,
                corrected_phrase: corr,
                context_before: ctxBefore,
                context_after: ctxAfter,
                user_id: userId || null,
                vote_count: 1,
                status: 'pending',
              },
            ]);
          }
        }
      } catch (err) {
        console.warn('[Correction Feedback Error]:', err);
      }
    }

    return NextResponse.json({
      success: true,
      processed: validDiffs.length,
      resultsCount: results.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
