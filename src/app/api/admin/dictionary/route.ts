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
  // Use service role key if configured, otherwise fallback to anon key
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// POST: Add new entry or batch seed entries
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized: สิทธิ์ไม่ถูกต้อง' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase credentials are not configured on the server' }, { status: 500 });
  }

  try {
    const body = await request.json();

    if (body.action === 'seed' && Array.isArray(body.entries)) {
      const { data, error } = await supabase
        .from('custom_dictionary')
        .upsert(body.entries, { onConflict: 'wrong_word' })
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, data, count: data?.length || 0 });
    }

    // Single insert
    const { wrong_word, correct_word, category } = body;
    if (!wrong_word || !correct_word) {
      return NextResponse.json({ error: 'คำผิดและคำถูกจำเป็นต้องระบุ' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('custom_dictionary')
      .insert([
        {
          wrong_word: wrong_word.trim(),
          correct_word: correct_word.trim(),
          category: category || 'general',
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT: Update an existing entry
export async function PUT(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized: สิทธิ์ไม่ถูกต้อง' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase credentials are not configured on the server' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { id, wrong_word, correct_word, category } = body;

    if (!id || !wrong_word || !correct_word) {
      return NextResponse.json({ error: 'ID, คำผิด และคำถูกจำเป็นต้องระบุ' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('custom_dictionary')
      .update({
        wrong_word: wrong_word.trim(),
        correct_word: correct_word.trim(),
        category: category || 'general',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: Delete an entry
export async function DELETE(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized: สิทธิ์ไม่ถูกต้อง' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase credentials are not configured on the server' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID จำเป็นต้องระบุ' }, { status: 400 });
    }

    const { error } = await supabase
      .from('custom_dictionary')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
