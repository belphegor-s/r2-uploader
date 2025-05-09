import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function DashboardLayout({ children }) {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/upload');
  }

  return <>{children}</>;
}
