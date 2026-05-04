import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import speakeasy from 'speakeasy';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
        otp: { label: 'Code', type: 'text' },
      },
      async authorize(credentials) {
        const { username, password, otp } = credentials || {};
        const adminUsername = process.env.ADMIN_USERNAME;
        const adminPassword = process.env.ADMIN_PASSWORD;
        const totpSecret = process.env.TOTP_SECRET;

        if (username !== adminUsername || password !== adminPassword) {
          return null;
        }

        const isVerified = speakeasy.totp.verify({
          secret: totpSecret,
          encoding: 'base32',
          token: otp,
          window: 1, // Allows for 30s clock drift (very important for prod)
        });

        if (!isVerified) return null;

        return { id: '1', name: 'ayush', email: 'hello@ayushsharma.me' };
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
