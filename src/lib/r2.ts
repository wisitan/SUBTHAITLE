import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'subthaitle-proxy';
const NEXT_PUBLIC_R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';

export function isR2Configured(): boolean {
  return Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

export function getR2Client(): S3Client | null {
  if (!isR2Configured()) return null;

  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Generate a presigned PUT URL for direct client-side upload to Cloudflare R2
 */
export async function createPresignedUploadUrl(
  key: string,
  contentType: string = 'video/mp4',
  expiresInSeconds: number = 3600
): Promise<{ uploadUrl: string; publicUrl: string } | null> {
  const s3 = getR2Client();
  if (!s3) return null;

  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });

    // Public URL format: https://<custom-domain-or-r2.dev>/<key>
    let publicUrl = '';
    if (NEXT_PUBLIC_R2_PUBLIC_URL) {
      const base = NEXT_PUBLIC_R2_PUBLIC_URL.replace(/\/$/, '');
      publicUrl = `${base}/${key}`;
    } else {
      publicUrl = `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
    }

    return { uploadUrl, publicUrl };
  } catch (error) {
    console.error('[R2 Presigned URL Error]:', error);
    return null;
  }
}

/**
 * Delete an object from Cloudflare R2
 */
export async function deleteR2Object(key: string): Promise<boolean> {
  const s3 = getR2Client();
  if (!s3) return false;

  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    await s3.send(command);
    return true;
  } catch (error) {
    console.warn('[R2 Delete Object Error]:', error);
    return false;
  }
}
