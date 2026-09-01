import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
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

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }

    const body = await request.json();
    const sessionId = body.sessionId as string;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    // Retrieve verified session directly from Stripe API
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session || session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed or session not found' },
        { status: 400 }
      );
    }

    const userId = session.metadata?.userId || session.client_reference_id;
    const packageId = session.metadata?.packageId || session.metadata?.tier || '';
    const minutesStr = session.metadata?.minutes;
    const isLifetime =
      session.metadata?.isLifetime === 'true' ||
      packageId === 'lifetime_699' ||
      packageId === 'tier_699';

    if (!userId) {
      return NextResponse.json({ error: 'No userId associated with session' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase admin client unavailable' }, { status: 500 });
    }

    // Check if transaction was already processed by Webhook
    const { data: existingTx } = await supabase
      .from('credit_transactions')
      .select('id')
      .eq('stripe_session_id', session.id)
      .maybeSingle();

    if (existingTx) {
      return NextResponse.json({ success: true, alreadyProcessed: true });
    }

    if (isLifetime) {
      const { error: rpcErr } = await supabase.rpc('unlock_lifetime_pass', {
        p_user_id: userId,
        p_stripe_session_id: session.id,
      });

      if (rpcErr) {
        console.warn('[Verify Session] RPC unlock_lifetime_pass failed, applying fallback:', rpcErr);
        await supabase
          .from('profiles')
          .update({
            is_lifetime_unlocked: true,
            tier: 'tier_699',
            stripe_customer_id: typeof session.customer === 'string' ? session.customer : undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      }
    } else {
      const minutes =
        parseInt(minutesStr || '0', 10) ||
        (packageId === 'credit_99'
          ? 60
          : packageId === 'credit_249'
          ? 180
          : packageId === 'credit_599'
          ? 480
          : 0);

      if (minutes > 0) {
        const { error: rpcErr } = await supabase.rpc('add_user_credits', {
          p_user_id: userId,
          p_minutes: minutes,
          p_description: `เติมเครดิตผ่าน Stripe (${packageId}) +${minutes} นาที`,
          p_stripe_session_id: session.id,
        });

        if (rpcErr) {
          console.warn('[Verify Session] RPC add_user_credits failed, applying fallback:', rpcErr);
          const { data: profile } = await supabase
            .from('profiles')
            .select('credits_minutes')
            .eq('id', userId)
            .single();

          const currentCredits = profile?.credits_minutes || 0;
          const newCredits = currentCredits + minutes;

          await supabase
            .from('profiles')
            .update({
              credits_minutes: newCredits,
              stripe_customer_id: typeof session.customer === 'string' ? session.customer : undefined,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          await supabase.from('credit_transactions').insert({
            user_id: userId,
            type: 'purchase',
            amount_minutes: minutes,
            balance_after: newCredits,
            description: `เติมเครดิตผ่าน Stripe (${packageId}) +${minutes} นาที`,
            stripe_session_id: session.id,
          });
        }
      }
    }

    return NextResponse.json({ success: true, verified: true });
  } catch (error) {
    console.error('[Verify Session Error]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error verifying session' },
      { status: 500 }
    );
  }
}
