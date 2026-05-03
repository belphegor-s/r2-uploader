import { NextResponse } from 'next/server';
import { requireAuthAndScope, badRequest, serverError } from '@/lib/r2/guard';
import { moveKeys } from '@/lib/r2/transfer';
import { ensureRootPrefixed } from '@/lib/r2/keys';

export async function POST(req, { params }) {
  const { scope: scopeName } = await params;
  const { error, scope } = await requireAuthAndScope(req, scopeName);
  if (error) return error;

  let body;
  try { body = await req.json(); } catch { return badRequest('Invalid JSON'); }
  const { keys = [], destPrefix = '' } = body || {};
  if (!Array.isArray(keys) || keys.length === 0) return badRequest('keys[] required');

  try {
    keys.forEach((k) => ensureRootPrefixed(k, scope.rootPrefix));
    const res = await moveKeys({ bucket: scope.bucket, keys, destRel: destPrefix, scopeRoot: scope.rootPrefix });
    return NextResponse.json({ ok: true, moved: res });
  } catch (err) {
    console.error('move error:', err);
    return serverError('Failed to move');
  }
}
