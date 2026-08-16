import { cookies } from 'next/headers';
import TrackingClient from './tracking-client';
import { KRIYO_SESSION_COOKIE } from '@/lib/session';
import { redirectTo } from '@/lib/redirect';

export default async function TrackingPage() {
  const cookieStore = await cookies();
  if (!cookieStore.has(KRIYO_SESSION_COOKIE)) {
    redirectTo('/sas');
  }

  return <TrackingClient />;
}
