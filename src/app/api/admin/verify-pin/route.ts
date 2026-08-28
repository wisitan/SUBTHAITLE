import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getAdminSecret(): string {
  return process.env.ADMIN_SECRET || '8762';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin } = body;

    const actualSecret = getAdminSecret();

    if (!pin || String(pin).trim() !== String(actualSecret).trim()) {
      return NextResponse.json(
        { success: false, error: 'รหัส PIN ไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // Generate lightweight verification token
    const token = Buffer.from(`${actualSecret}:subthaitle_admin_auth`).toString('base64');

    return NextResponse.json({
      success: true,
      token,
      message: 'ยืนยันสิทธิ์แอดมินสำเร็จ',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการตรวจสอบรหัส PIN' },
      { status: 500 }
    );
  }
}
