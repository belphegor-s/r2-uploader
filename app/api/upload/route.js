import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import Busboy from 'busboy';
import { Readable } from 'stream';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const isValidApiKey = (req) => {
  const apiKey = req.headers.get('x-api-key');
  return apiKey === process.env.INTERNAL_API_KEY;
};

export const r2Client = new S3Client({
  region: process.env.R2_REGION,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
});

export async function GET(req) {
  const session = await getServerSession(authOptions);

  if (!session && !isValidApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: 'uploads/',
    });

    const result = await r2Client.send(listCommand);

    const files = (result.Contents || []).map((file) => ({
      key: file.Key,
      url: `https://storage.pixly.sh/${file.Key}`,
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

  const fileUrls = [];
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
        const key = `uploads/${randomUUID()}-${filename}`;

        const command = new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          ACL: 'public-read',
        });

        const uploadPromise = r2Client.send(command).then(() => {
          const publicUrl = `https://storage.pixly.sh/${key}`;
          fileUrls.push(publicUrl);
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
        resolve(NextResponse.json({ urls: fileUrls }));
      } catch (err) {
        console.error('Error awaiting uploads:', err);
        reject(new NextResponse('Upload processing failed', { status: 500 }));
      }
    });

    Readable.from(req.body).pipe(busboy);
  });
}

export async function DELETE(req) {
  const { key } = await req.json();

  if (!key) {
    return NextResponse.json({ error: 'File key is required' }, { status: 400 });
  }

  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(deleteCommand);

    return NextResponse.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return new NextResponse('Failed to delete file', { status: 500 });
  }
}
