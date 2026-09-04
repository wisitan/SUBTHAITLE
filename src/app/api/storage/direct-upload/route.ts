import { NextRequest, NextResponse } from 'next/server';
import { getR2Client, isR2Configured } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'subthaitle-proxy';
const NEXT_PUBLIC_R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';

export async function POST(request: NextRequest) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json(
        { error: 'Cloudflare R2 is not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;
    const storageTier = (formData.get('storageTier') as string | null) || 'free';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const isThumb = String(projectId).startsWith('thumb_') || sanitizedFilename.endsWith('_thumb.jpg');
    const folderPrefix = isThumb
      ? 'thumbnails'
      : storageTier === 'vip'
      ? 'proxies/vip_perm'
      : 'proxies/free_7d';
    const cleanProjectId = String(projectId || 'guest').replace(/^thumb_/, '');
    const key = `${folderPrefix}/${cleanProjectId}/${Date.now()}_${sanitizedFilename}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const s3 = getR2Client();
    if (!s3) {
      return NextResponse.json({ error: 'Failed to init R2 client' }, { status: 500 });
    }

    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type || 'video/mp4',
      })
    );

    let publicUrl = '';
    if (NEXT_PUBLIC_R2_PUBLIC_URL) {
      const base = NEXT_PUBLIC_R2_PUBLIC_URL.replace(/\/$/, '');
      publicUrl = `${base}/${key}`;
    } else {
      publicUrl = `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
    }

    return NextResponse.json({
      success: true,
      publicUrl,
      key,
    });
  } catch (error) {
    console.error('[Server Direct Upload Error]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
