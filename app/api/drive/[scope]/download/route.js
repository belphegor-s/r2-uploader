import { Readable } from 'stream';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { requireAuthAndScope, badRequest, serverError } from '@/lib/r2/guard';
import { r2Client } from '@/lib/r2/client';
import { ensureRootPrefixed, basenameFromKey } from '@/lib/r2/keys';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  const { scope: scopeName } = await params;
  const { error, scope } = await requireAuthAndScope(req, scopeName);
  if (error) return error;

  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (!key) return badRequest('key required');

  try {
    ensureRootPrefixed(key, scope.rootPrefix);

    const obj = await r2Client.send(new GetObjectCommand({ Bucket: scope.bucket, Key: key }));

    const filename = basenameFromKey(key);
    // Escape only chars that break Content-Disposition header quoting
    const safeFilename = filename.replace(/["\\]/g, '_') || 'download';

    const headers = {
      'Content-Type': obj.ContentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
      'Cache-Control': 'no-store',
    };
    if (obj.ContentLength) {
      headers['Content-Length'] = String(obj.ContentLength);
    }

    const webStream = Readable.toWeb(obj.Body);

    return new Response(webStream, { headers });
  } catch (err) {
    console.error('download error:', err);
    return serverError('Download failed');
  }
}
