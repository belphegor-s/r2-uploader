import { NextResponse } from 'next/server';
import { PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import Busboy from 'busboy';
import { Readable } from 'stream';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isValidApiKey, r2Client } from '../route';

export async function GET(req) {
  const session = await getServerSession(authOptions);

  if (!session && !isValidApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.R2_PRIVATE_BUCKET_NAME,
      Prefix: 'private/',
    });

    const result = await r2Client.send(listCommand);

    const files = (result.Contents || []).map((file) => ({
      key: file.Key,
      size: file.Size,
      lastModified: file.LastModified,
    }));

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error listing files:', error);
    return new NextResponse('Failed to list files', { status: 500 });
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);

  if (!session && !isValidApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = req.headers.get('content-type') || '';
  const busboy = Busboy({ headers: { 'content-type': contentType } });

  const uploadPromises = [];

  return new Promise((resolve, reject) => {
    busboy.on('file', (fieldname, file, fileData) => {
      const { filename, encoding, mimeType } = fileData;

      console.log('File received:', { fieldname, filename, encoding, mimeType });

      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
      let fileSize = 0;
      const chunks = [];

      file.on('data', (chunk) => {
        fileSize += chunk.length;

        if (fileSize > MAX_FILE_SIZE) {
          file.unpipe(); // stop reading
          file.resume(); // discard the rest
          const error = new Error(`File "${filename}" exceeds 100MB limit.`);
          error.statusCode = 413;
          return reject(new NextResponse(error.message, { status: error.statusCode }));
        }

        chunks.push(chunk);
      });

      file.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const key = `private/${randomUUID()}-${filename}`;

        const command = new PutObjectCommand({
          Bucket: process.env.R2_PRIVATE_BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        });

        const uploadPromise = r2Client.send(command).then(() => {
          console.log('Upload complete:', key);
        });

        uploadPromises.push(uploadPromise);
      });

      file.on('error', (err) => {
        console.error('File stream error:', err);
        reject(new NextResponse('File stream error', { status: 500 }));
      });
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
        resolve(NextResponse.json({ message: 'Upload complete' }));
      } catch (err) {
        console.error('Error awaiting uploads:', err);
        reject(new NextResponse('Upload processing failed', { status: 500 }));
      }
    });

    Readable.from(req.body).pipe(busboy);
  });
}
