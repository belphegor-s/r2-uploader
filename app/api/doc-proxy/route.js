import { NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client } from '@/lib/r2/client';
import { resolveScope } from '@/lib/r2/scope';
import { ensureRootPrefixed } from '@/lib/r2/keys';
import { verify } from '@/lib/sign-token';

const TOKEN_TTL = 600;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const scopeName = searchParams.get('scope');
  const key = searchParams.get('key');
  const exp = searchParams.get('exp');
  const sig = searchParams.get('sig');

  if (!scopeName || !key || !exp || !sig) {
    return new NextResponse('Missing parameters', { status: 400 });
  }

  const expiry = parseInt(exp, 10);
  if (!expiry || Date.now() / 1000 > expiry) {
    return new NextResponse('Token expired', { status: 403 });
  }

  const payload = `${scopeName}:${key}:${exp}`;
  if (!verify(payload, sig)) {
    return new NextResponse('Invalid token', { status: 403 });
  }

  let scope;
  try {
    scope = resolveScope(scopeName);
    ensureRootPrefixed(key, scope.rootPrefix);
  } catch {
    return new NextResponse('Invalid scope', { status: 400 });
  }

  try {
    let fetchUrl;
    if (scope.publicBase) {
      fetchUrl = `${scope.publicBase}/${key}`;
    } else {
      fetchUrl = await getSignedUrl(
        r2Client,
        new GetObjectCommand({ Bucket: scope.bucket, Key: key }),
        { expiresIn: TOKEN_TTL },
      );
    }

    const response = await fetch(fetchUrl);
    if (!response.ok) {
      return new NextResponse('File not found', { status: response.status });
    }

    const headers = new Headers();
    const contentType = response.headers.get('content-type');
    if (contentType) headers.set('content-type', contentType);
    const contentLength = response.headers.get('content-length');
    if (contentLength) headers.set('content-length', contentLength);
    headers.set('cache-control', `public, max-age=${TOKEN_TTL}`);

    return new NextResponse(response.body, { headers });
  } catch (err) {
    console.error('doc-proxy error:', err);
    return new NextResponse('Failed to fetch file', { status: 500 });
  }
}
