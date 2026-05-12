import crypto from 'crypto';

const SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || '';

export function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
}

export function verify(payload, expectedSig) {
  if (typeof expectedSig !== 'string' || expectedSig.length !== 64) return false;
  try {
    const actual = Buffer.from(sign(payload), 'hex');
    const expected = Buffer.from(expectedSig, 'hex');
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
