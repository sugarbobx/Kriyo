import { cookies } from 'next/headers';
import SasClient from './sas-client';
import { KRIYO_SESSION_COOKIE } from '@/lib/session';
import { redirectTo } from '@/lib/redirect';

export default async function SasPage() {
  const cookieStore = await cookies();
  if (cookieStore.has(KRIYO_SESSION_COOKIE)) {
    redirectTo('/dashboard');
  }

  return <SasClient />;
}
