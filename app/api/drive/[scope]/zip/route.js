import { Readable } from 'stream';
import { requireAuthAndScope, badRequest } from '@/lib/r2/guard';
import { streamZip } from '@/lib/r2/zip';
import { iterateAllObjects } from '@/lib/r2/listing';
import { ensureRootPrefixed, normalizePrefix, basenameFromKey } from '@/lib/r2/keys';

export const runtime = 'nodejs';

export async function POST(req, { params }) {
  const { scope: scopeName } = await params;
  const { error, scope } = await requireAuthAndScope(req, scopeName);
  if (error) return error;

  let body = {}; // Default to an empty object
  try {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const fd = await req.formData();
      const payload = fd.get('payload');
      if (payload && typeof payload === 'string') { // Ensure it's a string before parsing
        try {
          body = JSON.parse(payload);
        } catch (parseErr) {
          console.error('Failed to parse payload JSON:', parseErr);
          return badRequest('Invalid JSON payload'); // Return specific error for JSON parse failure
        }
      } else {
        const formKeys = [...fd.getAll('keys'), ...fd.getAll('keys[]')].filter((value) => typeof value === 'string');
        const folderPrefix = fd.get('folderPrefix');
        const filename = fd.get('filename');
        body = {
          ...(formKeys.length ? { keys: formKeys } : {}),
          ...(typeof folderPrefix === 'string' ? { folderPrefix } : {}),
          ...(typeof filename === 'string' ? { filename } : {}),
        };
      }
    }
  } catch (err) {
    console.error('Error parsing request body:', err);
    return badRequest('Invalid request body');
  }

  const { keys = [], folderPrefix, filename = 'download.zip' } = body;

  let stripPrefix = `${scope.rootPrefix}/`;

  try {
    let keysSource;
    if (folderPrefix !== undefined) {
      const norm = normalizePrefix(folderPrefix);
      const fullPrefix = norm ? `${scope.rootPrefix}/${norm}/` : `${scope.rootPrefix}/`;
      ensureRootPrefixed(fullPrefix, scope.rootPrefix);
      stripPrefix = fullPrefix;
      keysSource = iterateAllObjects(scope.bucket, fullPrefix);
    } else {
      if (!Array.isArray(keys) || keys.length === 0) return badRequest('keys[] or folderPrefix required');
      keys.forEach((k) => ensureRootPrefixed(k, scope.rootPrefix));
      keysSource = keys;
    }

    const archive = streamZip({
      bucket: scope.bucket,
      keys: keysSource,
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
