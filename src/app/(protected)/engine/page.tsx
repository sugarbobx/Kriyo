import { cookies } from 'next/headers';
import EngineClient from './engine-client';
import { KRIYO_SESSION_COOKIE } from '@/lib/session';
import { redirectTo } from '@/lib/redirect';

export default async function EnginePage() {
  const cookieStore = await cookies();
  if (!cookieStore.has(KRIYO_SESSION_COOKIE)) {
    redirectTo('/sas');
  }

  return <EngineClient />;
}
