import archiver from 'archiver';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2Client } from './client';
import { basenameFromKey, isFolderMarker } from './keys';

// Build a Node Readable stream of a zip archive containing the given keys.
// `entryNameFor(key)` returns the path-in-zip (default: filename only).
export function streamZip({ bucket, keys, entryNameFor }) {
  // Use level 1 for a good balance of speed and compression.
  const archive = archiver('zip', { zlib: { level: 1 } });

  archive.on('warning', (err) => {
    if (err.code !== 'ENOENT') console.error('archiver warning:', err);
  });
  archive.on('error', (err) => {
    console.error('archiver error:', err);
  });

  // Append entries with a concurrent worker pattern to hide latency.
  (async () => {
    try {
      const CONCURRENCY = 5;
      
      const iterator = (async function* () {
        if (keys && Symbol.asyncIterator in Object(keys)) {
          yield* keys;
        } else if (Array.isArray(keys)) {
          for (const k of keys) yield k;
        }
      })();

      const worker = async () => {
        while (true) {
          const { value: key, done } = await iterator.next();
          if (done) break;

          const actualKey = typeof key === 'string' ? key : key?.Key;
          if (!actualKey || isFolderMarker(actualKey)) continue;

          try {
            const res = await r2Client.send(new GetObjectCommand({ Bucket: bucket, Key: actualKey }));
            const entryName = entryNameFor ? entryNameFor(actualKey) : basenameFromKey(actualKey);
            archive.append(res.Body, { name: entryName });
          } catch (err) {
            console.error(`Error zipping key ${actualKey}:`, err);
            throw err; // Re-throw to propagate the error and abort Promise.all
          }
        }
      };

      // Run workers in parallel. Promise.all will reject if any worker rejects.
      await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
      await archive.finalize();
    } catch (err) {
      console.error('zip stream build error:', err);
      archive.abort(); // Ensure archive is aborted on any error
    }
  })();

  return archive;
}
