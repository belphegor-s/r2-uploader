import { signOut } from 'next-auth/react';

const Navbar = () => {
  return (
    <nav className="flex justify-between items-center bg-[#313131] border-b border-gray-700 shadow-md p-4 sticky top-0 z-10 right-0 left-0">
      <h1 className="text-xl font-semibold">R2 Uploader</h1>
      <button onClick={signOut} className="btn-danger">
        Sign out
      </button>
    </nav>
  );
};

export default Navbar;
