import { Readable } from 'stream';
import { requireAuthAndScope, badRequest } from '@/lib/r2/guard';
import { streamZip } from '@/lib/r2/zip';
import { iterateAllObjects } from '@/lib/r2/listing';
import { ensureRootPrefixed, normalizePrefix, isFolderMarker, basenameFromKey } from '@/lib/r2/keys';

export const runtime = 'nodejs';

export async function POST(req, { params }) {
  const { scope: scopeName } = await params;
  const { error, scope } = await requireAuthAndScope(req, scopeName);
  if (error) return error;

  let body;
  try { body = await req.json(); } catch { return badRequest('Invalid JSON'); }
  const { keys = [], folderPrefix, filename = 'download.zip' } = body || {};

  let allKeys = [];
  let stripPrefix = `${scope.rootPrefix}/`;

  try {
    if (folderPrefix !== undefined) {
      const norm = normalizePrefix(folderPrefix);
      const fullPrefix = norm ? `${scope.rootPrefix}/${norm}/` : `${scope.rootPrefix}/`;
      ensureRootPrefixed(fullPrefix, scope.rootPrefix);
      stripPrefix = fullPrefix;
      for await (const obj of iterateAllObjects(scope.bucket, fullPrefix)) {
        if (!isFolderMarker(obj.Key)) allKeys.push(obj.Key);
      }
    } else {
      if (!Array.isArray(keys) || keys.length === 0) return badRequest('keys[] or folderPrefix required');
      keys.forEach((k) => ensureRootPrefixed(k, scope.rootPrefix));
      allKeys = keys;
    }

    const archive = streamZip({
      bucket: scope.bucket,
      keys: allKeys,
      entryNameFor: (key) => {
        if (folderPrefix !== undefined && key.startsWith(stripPrefix)) {
          const rel = key.slice(stripPrefix.length);
          // Strip uuid prefix on the basename only, preserve folder structure
          const lastSlash = rel.lastIndexOf('/');
          const dir = lastSlash >= 0 ? rel.slice(0, lastSlash + 1) : '';
          const file = basenameFromKey(key);
          return `${dir}${file}`;
        }
        return basenameFromKey(key);
      },
    });

    const safeFilename = String(filename).replace(/[^\w.\-]+/g, '_') || 'download.zip';
    const webStream = Readable.toWeb(archive);

    return new Response(webStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('zip error:', err);
    return new Response('Failed to build zip', { status: 500 });
  }
}
