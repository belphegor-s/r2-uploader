import { redirect, RedirectType } from 'next/navigation';

export function GET() {
  return redirect('/upload/public', RedirectType.replace);
}
