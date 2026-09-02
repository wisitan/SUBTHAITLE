import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deleteR2Object } from '@/lib/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RETENTION_DAYS = 60; // Auto-purge projects inactive for > 60 days

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

// GET /api/projects?userId=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
    }

    // 1. Passive Auto-Purge: Clean up projects with updated_at older than 60 days for this user
    const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 86400 * 1000).toISOString();
    try {
      await supabase
        .from('user_projects')
        .delete()
        .eq('user_id', userId)
        .lt('updated_at', cutoffDate);
    } catch (cleanupErr) {
      console.warn('[Passive Purge Notice]:', cleanupErr);
    }

    // 2. Fetch active projects within 60-day retention window
    const { data: projects, error } = await supabase
      .from('user_projects')
      .select('id, user_id, title, duration, thumbnail_url, proxy_url, original_filename, captions, raw_words, style, aspect_ratio, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(30);

    if (error) {
      console.warn('[Projects API GET Error]:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ projects: projects || [] });
  } catch (error) {
    console.error('[Projects API Exception]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST /api/projects (Create or update project & reset 60-day clock)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      userId,
      title,
      duration,
      thumbnailUrl,
      proxyUrl,
      originalFilename,
      captions,
      rawWords,
      style,
      aspectRatio,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
    }

    const projectPayload: Record<string, unknown> = {
      user_id: userId,
      title: title || 'โปรเจกต์ไม่มีชื่อ',
      duration: duration || 0,
      thumbnail_url: thumbnailUrl || null,
      captions: captions || [],
      raw_words: rawWords || [],
      style: style || {},
      aspect_ratio: aspectRatio || '9:16',
      updated_at: new Date().toISOString(), // Reset the 60-day clock
    };

    if (proxyUrl) projectPayload.proxy_url = proxyUrl;
    if (originalFilename) projectPayload.original_filename = originalFilename;

    let resultProject;

    if (id) {
      // Update existing project -> resets updated_at
      const { data, error } = await supabase
        .from('user_projects')
        .update(projectPayload)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.warn('[Projects API Update Error]:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      resultProject = data;
    } else {
      // Insert new project
      const { data, error } = await supabase
        .from('user_projects')
        .insert({
          ...projectPayload,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.warn('[Projects API Insert Error]:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      resultProject = data;
    }

    return NextResponse.json({ success: true, project: resultProject });
  } catch (error) {
    console.error('[Projects API POST Exception]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects?id=...&userId=...
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id || !userId) {
      return NextResponse.json({ error: 'Missing id or userId' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
    }

    // Optional: fetch project to check if proxy needs deletion in R2
    const { data: project } = await supabase
      .from('user_projects')
      .select('proxy_url')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (project?.proxy_url) {
      try {
        const urlParts = new URL(project.proxy_url);
        const r2Key = urlParts.pathname.replace(/^\//, '');
        if (r2Key) await deleteR2Object(r2Key);
      } catch (r2Err) {
        console.warn('[R2 Proxy Delete Warning]:', r2Err);
      }
    }

    const { error } = await supabase
      .from('user_projects')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.warn('[Projects API DELETE Error]:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Projects API DELETE Exception]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
