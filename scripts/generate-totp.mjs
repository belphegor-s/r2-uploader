import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

async function generate() {
  const secret = speakeasy.generateSecret({
    name: 'R2 Uploader (ayush)',
    issuer: 'r2.pixly.sh',
  });

  console.log('\n=============================================');
  console.log('🔐 TOTP SETUP INSTRUCTIONS');
  console.log('=============================================\n');
  console.log('1. Add this exact secret to your .env file:');
  console.log(`   TOTP_SECRET=${secret.base32}\n`);
  console.log('2. Scan this QR Code with your Authenticator app:\n');

  // 2. Generate and print QR Code
  qrcode.toString(secret.otpauth_url, { type: 'terminal', small: true }, (err, url) => {
    if (err) return console.error(err);
    console.log(url);
    console.log('=============================================\n');
  });
}

generate();
