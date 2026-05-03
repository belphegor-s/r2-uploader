import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { requireAuthAndScope, badRequest, serverError } from '@/lib/r2/guard';
import { r2Client } from '@/lib/r2/client';
import { folderMarkerKey, normalizePrefix, safeSegment, ensureRootPrefixed } from '@/lib/r2/keys';
import { deleteRecursive } from '@/lib/r2/listing';

export async function POST(req, { params }) {
  const { scope: scopeName } = await params;
  const { error, scope } = await requireAuthAndScope(req, scopeName);
  if (error) return error;

  let body;
  try { body = await req.json(); } catch { return badRequest('Invalid JSON'); }
  const { prefix = '', name } = body || {};
  const cleanName = safeSegment(name);
  if (!cleanName) return badRequest('Folder name required');

  const newRel = [normalizePrefix(prefix), cleanName].filter(Boolean).join('/');
  const markerKey = folderMarkerKey(scope.rootPrefix, newRel);
  ensureRootPrefixed(markerKey, scope.rootPrefix);

  try {
    await r2Client.send(new PutObjectCommand({
      Bucket: scope.bucket,
      Key: markerKey,
      Body: '',
      ContentType: 'application/x-directory',
    }));
    return NextResponse.json({ ok: true, prefix: newRel });
  } catch (err) {
    console.error('folder create error:', err);
    return serverError('Failed to create folder');
  }
}

export async function DELETE(req, { params }) {
  const { scope: scopeName } = await params;
  const { error, scope } = await requireAuthAndScope(req, scopeName);
  if (error) return error;

  let body;
  try { body = await req.json(); } catch { return badRequest('Invalid JSON'); }
  const { prefix } = body || {};
  const norm = normalizePrefix(prefix);
  if (!norm) return badRequest('Prefix required');

  const fullPrefix = `${scope.rootPrefix}/${norm}/`;
  ensureRootPrefixed(fullPrefix, scope.rootPrefix);

  try {
    const res = await deleteRecursive(scope.bucket, fullPrefix);
    return NextResponse.json({ ok: true, ...res });
  } catch (err) {
    console.error('folder delete error:', err);
    return serverError('Failed to delete folder');
  }
}
