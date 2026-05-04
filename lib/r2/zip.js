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

  // Append entries with a sliding window of concurrent R2 fetches to hide latency.
  (async () => {
    try {
      const CONCURRENCY = 5;
      const queue = [];
      
      const iterator = (async function* () {
        if (Symbol.asyncIterator in Object(keys)) {
          yield* keys;
        } else if (Array.isArray(keys)) {
          for (const k of keys) yield k;
        }
      })();

      const getNextStream = async () => {
        const { value: key, done } = await iterator.next();
        if (done) return null;
        
        const actualKey = typeof key === 'string' ? key : key.Key;
        if (!actualKey || isFolderMarker(actualKey)) return getNextStream();
        
        const res = await r2Client.send(new GetObjectCommand({ Bucket: bucket, Key: actualKey }));
        return { res, key: actualKey };
      };

      // Fill initial queue
      for (let i = 0; i < CONCURRENCY; i++) {
        const p = getNextStream();
        queue.push(p);
      }

      while (queue.length > 0) {
        const currentPromise = queue.shift();
        const nextPromise = getNextStream();
        queue.push(nextPromise);

        const result = await currentPromise;
        if (!result) {
          // If we got null, it means we reached the end. 
          // We should stop adding to the queue but keep processing existing promises.
          continue;
        }

        const { res, key } = result;
        const entryName = entryNameFor ? entryNameFor(key) : basenameFromKey(key);
        
        await new Promise((resolve, reject) => {
          archive.append(res.Body, { name: entryName });
          const onEntry = (entry) => {
            if (entry.name === entryName) {
              archive.removeListener('error', reject);
              resolve();
            }
          };
          archive.once('entry', onEntry);
          archive.once('error', reject);
        });
      }

      await archive.finalize();
    } catch (err) {
      console.error('zip stream build error:', err);
      archive.abort();
    }
  })();

  return archive;
}
