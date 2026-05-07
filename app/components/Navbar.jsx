'use client';

import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
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
        <span className="hidden sm:inline">R2 Drive</span>
      </h1>

      {(isPublic || isPrivate) && (
        <div className="flex items-center bg-[#1c1c1c] rounded-full p-1 border border-gray-700 relative">
          {[
            { href: '/upload/public', icon: <Globe size={14} />, label: 'Public', active: isPublic },
            { href: '/upload/private', icon: <Lock size={14} />, label: 'Private', active: isPrivate },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm transition-colors ${item.active ? 'text-white' : 'text-gray-300 hover:text-white'}`}
            >
              {item.active && <motion.span layoutId="navPill" className="absolute inset-0 bg-blue-600 rounded-full -z-0" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
              <span className="relative z-10 flex items-center gap-1.5">
                {item.icon} {item.label}
              </span>
            </Link>
          ))}
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.96 }}
        whileHover={{ y: -1 }}
        onClick={() => signOut()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#7a1f1f] hover:bg-[#b22222] text-xs sm:text-sm text-white"
      >
        <LogOut size={14} />
        <span className="hidden sm:inline">Sign out</span>
      </motion.button>
    </nav>
  );
};

export default Navbar;
