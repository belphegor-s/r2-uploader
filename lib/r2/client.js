import { S3Client } from '@aws-sdk/client-s3';

let _client;

export function getR2Client() {
  if (!_client) {
    _client = new S3Client({
      region: 'auto',
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      // R2 doesn't support flexible checksums yet, and they cause 403 on presigned URLs
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }
  return _client;
}

export const r2Client = getR2Client();

export function isValidApiKey(req) {
  const apiKey = req.headers.get('x-api-key');
  return apiKey === process.env.INTERNAL_API_KEY;
}
