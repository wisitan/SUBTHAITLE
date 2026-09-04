import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deleteR2Object } from '@/lib/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RETENTION_DAYS = 7;

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

/**
 * GET /api/cron/cleanup-projects
 * Scheduled Job to purge projects inactive for > 60 days
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Validate cron secret if configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
    }

    const nowIso = new Date().toISOString();
    const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 86400 * 1000).toISOString();

    // 1. Find all expired FREE proxies (VIP is strictly excluded from deletion)
    // Query projects where proxy_url exists and either proxy_expires_at has passed,
    // or (legacy fallback) updated_at < 7 days and storage_tier is not 'vip'
    const { data: expiredFreeProxies, error: fetchError } = await supabase
      .from('user_projects')
      .select('id, proxy_url, storage_tier, proxy_expires_at, updated_at')
      .not('proxy_url', 'is', null)
      .neq('storage_tier', 'vip')
      .or(`proxy_expires_at.lte.${nowIso},and(proxy_expires_at.is.null,updated_at.lt.${cutoffDate})`)
      .limit(100);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    let purgedR2Count = 0;

    if (expiredFreeProxies && expiredFreeProxies.length > 0) {
      // 2. Clean up R2 proxy files from Cloudflare R2
      for (const p of expiredFreeProxies) {
        if (p.proxy_url) {
          try {
            const urlParts = new URL(p.proxy_url);
            const r2Key = urlParts.pathname.replace(/^\//, '');
            if (r2Key) {
              const deleted = await deleteR2Object(r2Key);
              if (deleted) purgedR2Count++;
            }
          } catch (r2Err) {
            console.warn('[Cron R2 Cleanup Warning]:', r2Err);
          }
        }
      }

      // 3. Clear proxy_url and proxy_expires_at in database
      // Preserves user's subtitle text and project settings so local resumption works!
      const expiredIds = expiredFreeProxies.map((p) => p.id);
      await supabase
        .from('user_projects')
        .update({ proxy_url: null, proxy_expires_at: null })
        .in('id', expiredIds);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully purged ${purgedR2Count} expired free proxies from R2 (VIP permanent proxies preserved).`,
      purgedR2Count,
    });
  } catch (error) {
    console.error('[Cron Cleanup Exception]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
