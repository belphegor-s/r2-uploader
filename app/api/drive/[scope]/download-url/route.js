import { NextResponse } from 'next/server';
import { HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requireAuthAndScope, badRequest, serverError } from '@/lib/r2/guard';
import { r2Client } from '@/lib/r2/client';
import { ensureRootPrefixed, basenameFromKey } from '@/lib/r2/keys';

export async function GET(req, { params }) {
  const { scope: scopeName } = await params;
  const { error, scope } = await requireAuthAndScope(req, scopeName);
  if (error) return error;

  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (!key) return badRequest('key required');

  try {
    ensureRootPrefixed(key, scope.rootPrefix);

    const filename = basenameFromKey(key);
    const safeFilename = filename.replace(/["\\]/g, '_') || 'download';

    const head = await r2Client.send(new HeadObjectCommand({ Bucket: scope.bucket, Key: key }));

    let downloadUrl;
    if (scope.publicBase) {
      downloadUrl = `${scope.publicBase}/${key}`;
    } else {
      downloadUrl = await getSignedUrl(
        r2Client,
        new GetObjectCommand({
          Bucket: scope.bucket,
          Key: key,
          ResponseContentDisposition: `attachment; filename="${safeFilename}"`,
        }),
        { expiresIn: 300 },
      );
    }

    return NextResponse.json({
      url: downloadUrl,
      filename: safeFilename,
      contentLength: head.ContentLength ?? null,
      contentType: head.ContentType ?? 'application/octet-stream',
    });
  } catch (err) {
    console.error('download-url error:', err);
    return serverError('Failed to generate download URL');
  }
}
