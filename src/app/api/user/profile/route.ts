import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    if (!userId && !email) {
      return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database client unavailable' }, { status: 500 });
    }

    let query = supabase.from('profiles').select('*');
    if (userId) {
      query = query.eq('id', userId);
    } else if (email) {
      query = query.eq('email', email);
    }

    const { data: profile, error } = await query.maybeSingle();

    if (error) {
      console.warn('[User Profile API Error]:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile: profile || null });
  } catch (error) {
    console.error('[User Profile Route Error]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database client unavailable' }, { status: 500 });
    }

    if (action === 'reset_quota') {
      const isDevOrUat =
        process.env.NODE_ENV !== 'production' ||
        process.env.NEXT_PUBLIC_APP_ENV === 'uat' ||
        process.env.VERCEL_ENV === 'preview' ||
        process.env.VERCEL_ENV === 'development';

      let allowed = isDevOrUat;
      if (!allowed) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('tier')
          .eq('id', userId)
          .maybeSingle();
        if (userProfile?.tier === 'admin') {
          allowed = true;
        }
      }

      if (!allowed) {
        return NextResponse.json(
          { error: 'ฟังก์ชันรีเซ็ตโควต้าเปิดให้ใช้งานเฉพาะในระบบทดสอบ (UAT/Dev) หรือผู้ดูแลระบบเท่านั้นค่ะ' },
          { status: 403 }
        );
      }

      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
      const { error } = await supabase
        .from('profiles')
        .update({
          groq_free_count: 0,
          groq_free_day: today,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.warn('[User Profile Reset Error]:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'รีเซ็ตโควต้าฟรีประจำวันสำเร็จ' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

