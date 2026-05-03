import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import Busboy from 'busboy';
import { Readable } from 'stream';
import { requireAuthAndScope } from '@/lib/r2/guard';
import { r2Client } from '@/lib/r2/client';
import { normalizePrefix, uuidPrefixedFilename, safeSegment, ensureRootPrefixed } from '@/lib/r2/keys';

const MAX_FILE_SIZE = 100 * 1024 * 1024;

export async function POST(req, { params }) {
  const { scope: scopeName } = await params;
  const { error, scope } = await requireAuthAndScope(req, scopeName);
  if (error) return error;

  const contentType = req.headers.get('content-type') || '';
  const busboy = Busboy({ headers: { 'content-type': contentType } });

  let basePrefix = '';
  const filesData = [];
  const uploadPromises = [];
  // Per-file metadata captured from preceding fields. Convention: client appends
  // a field "relativePath" RIGHT BEFORE each "files" entry to assign that path.
  const pendingPaths = [];

  return new Promise((resolve, reject) => {
    busboy.on('field', (name, value) => {
      if (name === 'prefix') basePrefix = value || '';
      else if (name === 'relativePath') pendingPaths.push(value || '');
    });

    busboy.on('file', (fieldname, file, fileData) => {
      const { filename, mimeType } = fileData;
      const relPath = pendingPaths.shift() || '';

      let fileSize = 0;
      const chunks = [];
      file.on('data', (chunk) => {
        fileSize += chunk.length;
        if (fileSize > MAX_FILE_SIZE) {
          file.unpipe();
          file.resume();
          return reject(new NextResponse(`File "${filename}" exceeds 100MB limit.`, { status: 413 }));
        }
        chunks.push(chunk);
      });

      file.on('end', () => {
        const buffer = Buffer.concat(chunks);

        // Compute folder portion
        // relativePath like "subfolder/inner/foo.png" or just "foo.png" or empty.
        const relParts = (relPath || '').split('/').filter(Boolean);
        relParts.pop(); // drop filename portion
        const subFolder = relParts.map(safeSegment).filter(Boolean).join('/');

        const cleanedBase = normalizePrefix(basePrefix);
        const folderRel = [cleanedBase, subFolder].filter(Boolean).join('/');
        const folderAbs = folderRel ? `${scope.rootPrefix}/${folderRel}` : scope.rootPrefix;
        const key = `${folderAbs}/${uuidPrefixedFilename(filename)}`;
        ensureRootPrefixed(key, scope.rootPrefix);

        const command = new PutObjectCommand({
          Bucket: scope.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          ...(scope.acl ? { ACL: scope.acl } : {}),
        });
        const p = r2Client.send(command).then(() => {
          filesData.push({ key, name: filename, size: buffer.length });
        });
        uploadPromises.push(p);
      });

      file.on('error', (err) => {
        console.error('File stream error:', err);
        reject(new NextResponse('File stream error', { status: 500 }));
      });
    });

    busboy.on('error', (err) => {
      console.error('Busboy error:', err);
      reject(new NextResponse('Parsing error', { status: 500 }));
    });

    busboy.on('finish', async () => {
      try {
        await Promise.all(uploadPromises);
        resolve(NextResponse.json({ message: 'Upload complete', files: filesData }));
      } catch (err) {
        console.error('Error awaiting uploads:', err);
        reject(new NextResponse('Upload processing failed', { status: 500 }));
      }
    });

    Readable.from(req.body).pipe(busboy);
  });
}
