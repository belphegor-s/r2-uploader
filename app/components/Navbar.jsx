import { signOut } from 'next-auth/react';

const Navbar = () => {
  return (
    <nav className="flex justify-between items-center bg-white border-b border-gray-200 shadow-md p-4 sticky top-0 z-10 right-0 left-0">
      <h1 className="text-xl font-semibold">R2 Uploader</h1>
      <button
        onClick={signOut}
        className="cursor-pointer flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-500 hover:bg-red-700 disabled:opacity-70 disabled:hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      >
        Sign out
      </button>
    </nav>
  );
};

export default Navbar;
