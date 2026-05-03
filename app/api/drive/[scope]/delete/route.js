import { NextResponse } from 'next/server';
import { requireAuthAndScope, badRequest, serverError } from '@/lib/r2/guard';
import { deleteKeysBatched } from '@/lib/r2/listing';
import { ensureRootPrefixed } from '@/lib/r2/keys';

export async function POST(req, { params }) {
  const { scope: scopeName } = await params;
  const { error, scope } = await requireAuthAndScope(req, scopeName);
  if (error) return error;

  let body;
  try { body = await req.json(); } catch { return badRequest('Invalid JSON'); }
  const keys = Array.isArray(body?.keys) ? body.keys : [];
  if (keys.length === 0) return badRequest('keys[] required');

  try {
    keys.forEach((k) => ensureRootPrefixed(k, scope.rootPrefix));
    const res = await deleteKeysBatched(scope.bucket, keys);
    return NextResponse.json({ ok: true, ...res });
  } catch (err) {
    console.error('delete error:', err);
    return serverError('Failed to delete');
  }
}
