import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getAdminSecret(): string {
  return process.env.ADMIN_SECRET || '8762';
}

function verifyAdmin(request: NextRequest): boolean {
  const token = request.headers.get('x-admin-token');
  const secret = request.headers.get('x-admin-secret');
  const actualSecret = getAdminSecret();

  if (secret && secret === actualSecret) return true;

  if (token) {
    const expectedToken = Buffer.from(`${actualSecret}:subthaitle_admin_auth`).toString('base64');
    if (token === expectedToken) return true;
  }

  return false;
}

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

// GET: Fetch feedback list and stats
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized: สิทธิ์ไม่ถูกต้อง' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase
      .from('correction_feedback')
      .select('*')
      .order('vote_count', { ascending: false })
      .order('updated_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`original_phrase.ilike.%${search}%,corrected_phrase.ilike.%${search}%`);
    }

    const { data: feedbackList, error } = await query;

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return NextResponse.json({ data: [], stats: { total: 0, pending: 0, auto_learned: 0, approved: 0 }, isTableMissing: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Compute stats
    const all = feedbackList || [];
    const stats = {
      total: all.length,
      pending: all.filter((f) => f.status === 'pending').length,
      auto_learned: all.filter((f) => f.status === 'auto_learned').length,
      approved: all.filter((f) => f.status === 'approved').length,
      rejected: all.filter((f) => f.status === 'rejected').length,
    };

    return NextResponse.json({ data: all, stats });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: Approve or Reject a feedback entry
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized: สิทธิ์ไม่ถูกต้อง' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { action, id } = body;

    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Fetch the feedback entry
    const { data: feedbackItem, error: fetchErr } = await supabase
      .from('correction_feedback')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !feedbackItem) {
      return NextResponse.json({ error: 'Feedback item not found' }, { status: 404 });
    }

    if (action === 'approve') {
      // 1. Update feedback status to approved
      await supabase
        .from('correction_feedback')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', id);

      // 2. Upsert into custom_dictionary
      await supabase.from('custom_dictionary').upsert(
        {
          wrong_word: feedbackItem.original_phrase,
          correct_word: feedbackItem.corrected_phrase,
          category: 'auto_learned',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'wrong_word' }
      );

      return NextResponse.json({ success: true, message: 'อนุมัติคำศัพท์เข้าสู่ Dictionary สำเร็จ' });
    } else if (action === 'reject') {
      // 1. Update feedback status to rejected
      await supabase
        .from('correction_feedback')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', id);

      // 2. Remove from custom_dictionary if it was previously auto-learned
      await supabase
        .from('custom_dictionary')
        .delete()
        .eq('wrong_word', feedbackItem.original_phrase);

      return NextResponse.json({ success: true, message: 'ปฏิเสธคำศัพท์เรียบร้อยแล้ว' });
    }

    return NextResponse.json({ error: 'Unhandled action' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: Delete a feedback entry permanently
export async function DELETE(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized: สิทธิ์ไม่ถูกต้อง' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase.from('correction_feedback').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'ลบรายการสำเร็จ' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
