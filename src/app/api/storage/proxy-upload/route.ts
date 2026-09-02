import { NextRequest, NextResponse } from 'next/server';
import { createPresignedUploadUrl, isR2Configured } from '@/lib/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { filename, contentType, projectId } = await request.json();

    if (!filename) {
      return NextResponse.json({ error: 'Missing filename' }, { status: 400 });
    }

    if (!isR2Configured()) {
      return NextResponse.json({
        isConfigured: false,
        message: 'Cloudflare R2 is not configured in environment variables. Falling back to local cache.',
      });
    }

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `proxies/${projectId || 'guest'}/${Date.now()}_${sanitizedFilename}`;

    const presignedData = await createPresignedUploadUrl(
      key,
      contentType || 'video/mp4',
      3600
    );

    if (!presignedData) {
      return NextResponse.json(
        { error: 'Failed to generate R2 presigned upload URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      isConfigured: true,
      uploadUrl: presignedData.uploadUrl,
      publicUrl: presignedData.publicUrl,
      key,
    });
  } catch (error) {
    console.error('[Proxy Upload Route Error]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
