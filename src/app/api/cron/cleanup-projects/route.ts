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

    const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 86400 * 1000).toISOString();

    // 1. Find all expired projects
    const { data: expiredProjects, error: fetchError } = await supabase
      .from('user_projects')
      .select('id, proxy_url')
      .lt('updated_at', cutoffDate)
      .limit(100);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!expiredProjects || expiredProjects.length === 0) {
      return NextResponse.json({ message: 'No expired projects found', purgedCount: 0 });
    }

    // 2. Clean up R2 proxy files if any
    for (const p of expiredProjects) {
      if (p.proxy_url) {
        try {
          const urlParts = new URL(p.proxy_url);
          const r2Key = urlParts.pathname.replace(/^\//, '');
          if (r2Key) await deleteR2Object(r2Key);
        } catch (r2Err) {
          console.warn('[Cron R2 Cleanup Warning]:', r2Err);
        }
      }
    }

    // 3. Delete database rows
    const expiredIds = expiredProjects.map((p) => p.id);
    const { error: deleteError } = await supabase
      .from('user_projects')
      .delete()
      .in('id', expiredIds);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully purged ${expiredProjects.length} inactive projects (> ${RETENTION_DAYS} days)`,
      purgedCount: expiredProjects.length,
    });
  } catch (error) {
    console.error('[Cron Cleanup Exception]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
