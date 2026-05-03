import { ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { r2Client } from './client';

// Page through every object under a prefix.
export async function* iterateAllObjects(bucket, prefix) {
  let token;
  do {
    const cmd = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: token,
    });
    const res = await r2Client.send(cmd);
    if (res.Contents) {
      for (const obj of res.Contents) yield obj;
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
}

export async function listOneLevel(bucket, prefix) {
  const folders = [];
  const files = [];
  let token;
  do {
    const cmd = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      Delimiter: '/',
      ContinuationToken: token,
    });
    const res = await r2Client.send(cmd);
    if (res.CommonPrefixes) {
      for (const cp of res.CommonPrefixes) folders.push(cp.Prefix);
    }
    if (res.Contents) {
      for (const obj of res.Contents) files.push(obj);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return { folders, files };
}

export async function deleteKeysBatched(bucket, keys) {
  if (!keys || keys.length === 0) return { deleted: 0 };
  let total = 0;
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    const cmd = new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
    });
    const res = await r2Client.send(cmd);
    total += chunk.length - (res.Errors?.length || 0);
  }
  return { deleted: total };
}

export async function deleteRecursive(bucket, prefix) {
  const keys = [];
  for await (const obj of iterateAllObjects(bucket, prefix)) {
    keys.push(obj.Key);
  }
  return deleteKeysBatched(bucket, keys);
}
