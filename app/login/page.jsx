'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import CFIcon from '@/assets/cloudflare-icon.svg';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (processing) return;
    setProcessing(true);
    setError('');

    const result = await signIn('credentials', {
      redirect: false,
      username,
      password,
    });

    if (result?.error) {
      const msg = 'Invalid username or password';
      setError(msg);
      toast.error(msg);
      setProcessing(false);
    } else {
      router.push('/upload');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 bg-[#272727]">
      {/* Dotted background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(ellipse at center, black 35%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 35%, transparent 80%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative w-full max-w-sm"
      >
        <div className="flex flex-col items-center gap-2 mb-7">
          <Image src={CFIcon} alt="Cloudflare" width={28} height={28} className="opacity-90" />
          <h1 className="text-base font-medium text-white">R2 Uploader</h1>
          <p className="text-xs text-gray-500">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            id="username"
            label="Username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => { setUsername(e.target.value); if (error) setError(''); }}
            placeholder="ayush"
            disabled={processing}
          />

          <Input
            id="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
            placeholder="••••••••"
            disabled={processing}
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-gray-500 hover:text-gray-300 transition"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          />

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-red-400"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={processing || !username || !password}
            className="w-full py-2 mt-2 rounded-md bg-white text-black text-sm font-medium hover:bg-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {processing ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                Signing in
              </span>
            ) : (
              'Sign in'
            )}
          </motion.button>
        </form>

        <p className="mt-8 text-center text-[11px] text-gray-600">
          Cloudflare R2 · Next.js
        </p>
      </motion.div>
    </div>
  );
}

function Input({ id, label, suffix, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          required
          {...props}
          className={`w-full ${suffix ? 'pr-9' : 'pr-3'} pl-3 py-2 rounded-md bg-transparent border border-gray-700 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-gray-400 transition disabled:opacity-60`}
        />
        {suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2">{suffix}</span>}
      </div>
    </div>
  );
}
