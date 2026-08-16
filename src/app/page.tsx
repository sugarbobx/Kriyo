import { cookies } from 'next/headers';
import { KRIYO_SESSION_COOKIE } from '@/lib/session';
import { redirectTo } from '@/lib/redirect';

export default async function HomePage() {
  const cookieStore = await cookies();
  const hasSession = cookieStore.has(KRIYO_SESSION_COOKIE);
  redirectTo(hasSession ? '/dashboard' : '/sas');
}
