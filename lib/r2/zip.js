import archiver from 'archiver';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2Client } from './client';
import { basenameFromKey, isFolderMarker } from './keys';

// Build a Node Readable stream of a zip archive containing the given keys.
// `entryNameFor(key)` returns the path-in-zip (default: filename only).
export function streamZip({ bucket, keys, entryNameFor }) {
  const archive = archiver('zip', { zlib: { level: 1 } });

  archive.on('warning', (err) => {
    if (err.code !== 'ENOENT') console.error('archiver warning:', err);
  });
  archive.on('error', (err) => {
    console.error('archiver error:', err);
  });

  // Append entries asynchronously, then finalize.
  (async () => {
    try {
      for (const key of keys) {
        if (!key || isFolderMarker(key)) continue;
        const get = await r2Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        const entryName = entryNameFor ? entryNameFor(key) : basenameFromKey(key);
        archive.append(get.Body, { name: entryName });
      }
      await archive.finalize();
    } catch (err) {
      console.error('zip stream build error:', err);
      archive.abort();
    }
  })();

  return archive;
}
