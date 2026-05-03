'use client';

import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Globe, Lock, LogOut } from 'lucide-react';
import CFIcon from '@/assets/cloudflare-icon.svg';

const Navbar = () => {
  const pathname = usePathname() || '';
  const isPrivate = pathname.startsWith('/upload/private');
  const isPublic = pathname.startsWith('/upload/public');

  return (
    <nav className="flex justify-between items-center bg-[#313131] border-b border-gray-700 shadow-md px-3 sm:px-4 py-3 sticky top-0 z-30">
      <h1 className="text-base sm:text-xl font-semibold flex items-center gap-2">
        <Image src={CFIcon} alt="Cloudflare Logo" width={32} height={32} />
        <span className="hidden sm:inline">R2 Uploader</span>
      </h1>

      {(isPublic || isPrivate) && (
        <div className="flex items-center bg-[#1c1c1c] rounded-full p-1 border border-gray-700">
          <Link
            href="/upload/public"
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm transition ${
              isPublic ? 'bg-blue-600 text-white shadow' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Globe size={14} /> Public
          </Link>
          <Link
            href="/upload/private"
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm transition ${
              isPrivate ? 'bg-blue-600 text-white shadow' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Lock size={14} /> Private
          </Link>
        </div>
      )}

      <button onClick={() => signOut()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#7a1f1f] hover:bg-[#b22222] text-xs sm:text-sm text-white">
        <LogOut size={14} />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </nav>
  );
};

export default Navbar;
