import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextResponse } from 'next/server';
import { r2Client } from '../../route';
import { Resend } from 'resend';
import { formatFileName } from '@/utils/formatFileName';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = 'Ayush Sharma <hello@ayushsharma.me>';

const MIN_EXPIRY = 30; // 30 seconds (keep as is)
const MAX_EXPIRY = 604800; // 7 days (instead of 3600 = 1 hour)

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const formatDuration = (seconds) => {
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minute${Math.floor(seconds / 60) !== 1 ? 's' : ''}`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) !== 1 ? 's' : ''}`;
  return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) !== 1 ? 's' : ''}`;
};

export async function POST(req) {
  try {
    const { key, expiry, emails } = await req.json();

    if (!key || typeof expiry !== 'number') {
      return NextResponse.json({ message: 'Invalid request. Key and expiry required.' }, { status: 400 });
    }

    if (expiry < MIN_EXPIRY || expiry > MAX_EXPIRY) {
      return NextResponse.json(
        {
          message: `Expiry must be between ${MIN_EXPIRY} seconds and ${MAX_EXPIRY} seconds (7 days).`,
        },
        { status: 400 },
      );
    }

    if (emails && (!Array.isArray(emails) || emails.some((email) => !isValidEmail(email)))) {
      return NextResponse.json({ message: 'Invalid email(s) provided.' }, { status: 400 });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.R2_PRIVATE_BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(r2Client, command, {
      expiresIn: expiry,
    });

    if (emails?.length > 0) {
      const fileName = formatFileName(key, 'private');

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: emails,
        subject: `Your Secure Download Link for "${fileName}"`,
        html: `
          <div style="font-family: sans-serif; color: #333; padding: 20px;">
            <h2>🔐 Here's your secure file link</h2>
            <p>You requested access to the file <strong>${fileName}</strong>.</p>
            <p>
              This link will expire in <strong>${formatDuration(expiry)}</strong>.
            </p>
            <p>
              <a href="${url}" style="display:inline-block;padding:10px 15px;background-color:#2563eb;color:white;text-decoration:none;border-radius:5px;margin-top:10px;">
                Download File
              </a>
            </p>
            <p style="font-size: 0.875rem; color: #666;">
              If you did not request this, you can ignore this email.
            </p>
          </div>
        `,
      });

      if (error) {
        console.error('Resend Error:', error);
        return NextResponse.json({ error: 'Failed to send email', details: error.message, url });
      }

      console.log('Resend Success:', data);
    }

    return NextResponse.json({ url, ...(emails && { message: `Your download link has been sent to ${emails.join(', ')}.` }) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Failed to generate URL' }, { status: 500 });
  }
}
