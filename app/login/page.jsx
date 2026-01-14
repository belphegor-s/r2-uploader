'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import CFIcon from '@/assets/cloudflare-icon.svg';
import Image from 'next/image';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [processing, setProcessing] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (processing) return;

    setProcessing(true);

    const result = await signIn('credentials', {
      redirect: false,
      username,
      password,
    });

    if (result?.error) {
      toast.error('Invalid username or password');
    } else {
      router.push('/upload');
    }

    setProcessing(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-[#313131] shadow-lg rounded-xl">
        <h2 className="text-3xl font-bold text-center text-[#f5f5f5] flex justify-center items-center gap-2 mb-4">
          <Image src={CFIcon} alt="Cloudflare Logo" width={40} height={40} />
          R2 Uploader
        </h2>
        <h4 className="text-lg font-semibold text-center text-gray-300">Login</h4>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[#f5f5f5]">
                Username
              </label>
              <input id="username" type="text" value={username} placeholder="Enter your username" onChange={(e) => setUsername(e.target.value)} required className="custom-input mt-1" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#f5f5f5]">
                Password
              </label>
              <input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required className="custom-input mt-1" />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={processing}>
            {processing ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
