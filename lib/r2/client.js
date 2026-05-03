import { S3Client } from '@aws-sdk/client-s3';

let _client;

export function getR2Client() {
  if (!_client) {
    _client = new S3Client({
      region: process.env.R2_REGION,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    });
  }
  return _client;
}

export const r2Client = getR2Client();

export function isValidApiKey(req) {
  const apiKey = req.headers.get('x-api-key');
  return apiKey === process.env.INTERNAL_API_KEY;
}
