import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_PACKAGES } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'ระบบชำระเงินยังไม่ได้ตั้งค่า STRIPE_SECRET_KEY บนเซิร์ฟเวอร์' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { tier, packageId, userId, userEmail } = body as {
      tier?: string;
      packageId?: string;
      userId: string;
      userEmail?: string;
    };

    const targetPackageId = packageId || tier;

    if (!targetPackageId || !STRIPE_PACKAGES[targetPackageId]) {
      return NextResponse.json(
        { error: 'กรุณาระบุแพ็กเกจที่ถูกต้อง (credit_99, credit_249, credit_599 หรือ lifetime_699)' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบด้วย Google ก่อนทำรายการชำระเงิน' },
        { status: 401 }
      );
    }

    const pkgInfo = STRIPE_PACKAGES[targetPackageId];
    const origin = request.headers.get('origin') || 'https://subthaitle.vercel.app';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['promptpay', 'card'],
      line_items: [
        {
          price_data: {
            currency: 'thb',
            product_data: {
              name: pkgInfo.name,
              description: pkgInfo.description,
            },
            unit_amount: pkgInfo.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: userEmail || undefined,
      client_reference_id: userId,
      metadata: {
        userId,
        packageId: targetPackageId,
        tier: targetPackageId,
        minutes: pkgInfo.minutes.toString(),
        isLifetime: pkgInfo.isLifetime ? 'true' : 'false',
      },
      success_url: `${origin}/credittopup/success?session_id={CHECKOUT_SESSION_ID}&packageId=${targetPackageId}`,
      cancel_url: `${origin}/credittopup`,
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
