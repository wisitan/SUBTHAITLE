import { NextRequest, NextResponse } from 'next/server';
import { stripe, TIER_PRICES } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'ระบบชำระเงินยังไม่ได้ตั้งค่า STRIPE_SECRET_KEY บนเซิร์ฟเวอร์' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { tier, userId, userEmail } = body as {
      tier: 'tier_99' | 'tier_299';
      userId: string;
      userEmail?: string;
    };

    if (!tier || !TIER_PRICES[tier]) {
      return NextResponse.json(
        { error: 'กรุณาระบุแพ็กเกจที่ถูกต้อง (tier_99 หรือ tier_299)' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบด้วย Google ก่อนทำรายการชำระเงิน' },
        { status: 401 }
      );
    }

    const tierInfo = TIER_PRICES[tier];
    const origin = request.headers.get('origin') || 'https://subthaitle.vercel.app';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['promptpay'],
      line_items: [
        {
          price_data: {
            currency: 'thb',
            product_data: {
              name: tierInfo.name,
              description: tierInfo.description,
            },
            unit_amount: tierInfo.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: userEmail || undefined,
      client_reference_id: userId,
      metadata: {
        userId,
        tier,
      },
      success_url: `${origin}/donate/success?session_id={CHECKOUT_SESSION_ID}&tier=${tier}`,
      cancel_url: `${origin}/donate`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสร้างรายการชำระเงิน' },
      { status: 500 }
    );
  }
}
