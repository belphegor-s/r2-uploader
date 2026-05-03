import { NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requireAuthAndScope, badRequest, serverError } from '@/lib/r2/guard';
import { r2Client } from '@/lib/r2/client';
import { ensureRootPrefixed } from '@/lib/r2/keys';

export async function GET(req, { params }) {
  const { scope: scopeName } = await params;
  const { error, scope } = await requireAuthAndScope(req, scopeName);
  if (error) return error;

  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (!key) return badRequest('key required');

  try {
    ensureRootPrefixed(key, scope.rootPrefix);
    if (scope.publicBase) {
      return NextResponse.json({ url: `${scope.publicBase}/${key}` });
    }
    const signed = await getSignedUrl(
      r2Client,
      new GetObjectCommand({ Bucket: scope.bucket, Key: key }),
      { expiresIn: 300 },
    );
    return NextResponse.json({ url: signed });
  } catch (err) {
    console.error('preview-url error:', err);
    return serverError('Failed to sign');
  }
}
