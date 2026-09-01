import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

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

    const signature = request.headers.get('stripe-signature');
    const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();

    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: 'Missing stripe signature or webhook secret' }, { status: 400 });
    }

    const payload = await request.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const supabase = getSupabaseAdmin();
      let userId = session.metadata?.userId || session.client_reference_id;
      const packageId = session.metadata?.packageId || session.metadata?.tier || '';
      const minutesStr = session.metadata?.minutes;
      const isLifetime = session.metadata?.isLifetime === 'true' || packageId === 'lifetime_699' || packageId === 'tier_699';

      if (!userId && supabase) {
        const email = session.customer_email || session.customer_details?.email;
        if (email) {
          const { data: userByEmail } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle();
          if (userByEmail) {
            userId = userByEmail.id;
          }
        }
      }

      if (userId && supabase) {
          // 1. Case: Lifetime Pass Purchase (699฿)
          if (isLifetime) {
            try {
              const { error: rpcError } = await supabase.rpc('unlock_lifetime_pass', {
                p_user_id: userId,
                p_stripe_session_id: session.id,
              });

              if (rpcError) {
                console.warn('[Stripe Webhook] unlock_lifetime_pass RPC error, falling back to direct table update:', rpcError);
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
              console.log(`[Stripe Webhook] Successfully unlocked Lifetime Pass for user ${userId}`);
            } catch (err) {
              console.error('[Stripe Webhook] Error unlocking Lifetime Pass:', err);
            }
          } else {
            // 2. Case: Pay-as-you-go Credit Package (99฿, 249฿, 599฿)
            const minutes = parseInt(minutesStr || '0', 10) || (packageId === 'credit_99' ? 60 : packageId === 'credit_249' ? 180 : packageId === 'credit_599' ? 480 : 0);

            if (minutes > 0) {
              try {
                const { error: rpcError } = await supabase.rpc('add_user_credits', {
                  p_user_id: userId,
                  p_minutes: minutes,
                  p_description: `เติมเครดิตผ่าน Stripe (${packageId}) +${minutes} นาที`,
                  p_stripe_session_id: session.id,
                });

                if (rpcError) {
                  console.warn('[Stripe Webhook] add_user_credits RPC error, falling back to manual increment:', rpcError);
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
                console.log(`[Stripe Webhook] Successfully added ${minutes} credits for user ${userId}`);
              } catch (err) {
                console.error('[Stripe Webhook] Error adding credits:', err);
              }
            }
          }
        }
      }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe Webhook Handler Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
