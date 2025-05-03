import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import Busboy from 'busboy';
import { Readable } from 'stream';

const r2Client = new S3Client({
  region: process.env.R2_REGION,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
});

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export async function POST(req) {
  const contentType = req.headers.get('content-type') || '';
  const busboy = Busboy({ headers: { 'content-type': contentType } });

  const fileUrls = [];
  const uploadPromises = [];

  return new Promise((resolve, reject) => {
    busboy.on('file', (fieldname, file, fileData) => {
      const { filename, encoding, mimeType } = fileData;

      console.log('File received:', { fieldname, filename, encoding, mimeType });

      const uploadPromise = streamToBuffer(file)
        .then((buffer) => {
          const key = `uploads/${randomUUID()}-${filename}`;

          const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: mimeType,
            ACL: 'public-read',
          });

          return r2Client.send(command).then(() => {
            const publicUrl = `https://storage.pixly.sh/${key}`;
            fileUrls.push(publicUrl);
          });
        })
        .catch((err) => {
          console.error('Upload failed:', err);
          reject(new NextResponse('File upload failed', { status: 500 }));
        });

      uploadPromises.push(uploadPromise);
    });

    busboy.on('error', (err) => {
      console.error('Busboy error:', err);
      reject(new NextResponse('Parsing error', { status: 500 }));
    });

    busboy.on('finish', async () => {
      console.log('All files parsed. Waiting for uploads...');
      try {
        await Promise.all(uploadPromises);
        console.log('All uploads complete.');
        resolve(NextResponse.json({ urls: fileUrls }));
      } catch (err) {
        console.error('Error awaiting uploads:', err);
        reject(new NextResponse('Upload processing failed', { status: 500 }));
      }
    });

    Readable.from(req.body).pipe(busboy);
  });
}
