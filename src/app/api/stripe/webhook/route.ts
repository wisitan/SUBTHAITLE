import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

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
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }

    const signature = request.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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
      const userId = session.metadata?.userId || session.client_reference_id;
      const tier = session.metadata?.tier;

      if (userId && (tier === 'tier_99' || tier === 'tier_299')) {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          const { error } = await supabase
            .from('profiles')
            .update({
              tier,
              stripe_customer_id: typeof session.customer === 'string' ? session.customer : undefined,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          if (error) {
            console.error('Error updating user tier in profiles table:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
          }

          console.log(`[Stripe Webhook] Successfully upgraded user ${userId} to ${tier}`);
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
