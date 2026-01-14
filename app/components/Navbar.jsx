import { signOut } from 'next-auth/react';
import CFIcon from '@/assets/cloudflare-icon.svg';
import Image from 'next/image';

const Navbar = () => {
  return (
    <nav className="flex justify-between items-center bg-[#313131] border-b border-gray-700 shadow-md p-4 sticky top-0 z-10 right-0 left-0">
      <h1 className="text-xl font-semibold flex justify-center items-center gap-2">
        <Image src={CFIcon} alt="Cloudflare Logo" width={40} height={40} />
        R2 Uploader
      </h1>
      <button onClick={signOut} className="btn-danger">
        Sign out
      </button>
    </nav>
  );
};

export default Navbar;
