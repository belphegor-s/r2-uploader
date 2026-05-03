'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Lock, User, Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react';
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
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-[#272727]">
      {/* Decorative gradient blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 w-[420px] h-[420px] rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 w-[360px] h-[360px] rounded-full bg-fuchsia-600/15 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        className="relative w-full max-w-md"
      >
        <div className="rounded-2xl bg-[#1c1c1c]/90 backdrop-blur-xl border border-gray-800 shadow-2xl overflow-hidden">
          <div className="px-7 pt-8 pb-6 border-b border-gray-800 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[#272727] border border-gray-700 flex items-center justify-center shadow-inner">
              <Image src={CFIcon} alt="Cloudflare Logo" width={32} height={32} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white tracking-tight">R2 Uploader</h1>
              <p className="text-sm text-gray-400 mt-1">Sign in to manage your storage</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-7 py-6 space-y-4">
            <Field
              id="username"
              label="Username"
              icon={<User size={15} />}
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); if (error) setError(''); }}
              placeholder="Enter your username"
              disabled={processing}
            />

            <Field
              id="password"
              label="Password"
              icon={<Lock size={15} />}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
              placeholder="Enter your password"
              disabled={processing}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-gray-400 hover:text-white p-1"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={processing || !username || !password}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
            >
              {processing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn size={15} /> Sign in
                </>
              )}
            </button>
          </form>

          <div className="px-7 py-3 bg-[#141414] border-t border-gray-800 flex items-center gap-2 text-[11px] text-gray-500">
            <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
            <span>Sessions are encrypted. Credentials never leave the server.</span>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-gray-500">
          Powered by Cloudflare R2 · Next.js
        </p>
      </motion.div>
    </div>
  );
}

function Field({ id, label, icon, suffix, ...inputProps }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={id}
          required
          {...inputProps}
          className={`w-full ${icon ? 'pl-9' : 'pl-3'} ${suffix ? 'pr-10' : 'pr-3'} py-2.5 rounded-md bg-[#2a2a2a] border border-gray-700 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition disabled:opacity-60`}
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">{suffix}</span>
        )}
      </div>
    </div>
  );
}
