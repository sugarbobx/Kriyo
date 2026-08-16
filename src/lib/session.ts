import { APP_BASE_PATH } from '@/lib/app-config';
import { getNextLocalMidnight } from '@/lib/time';

export const KRIYO_SESSION_COOKIE = 'kriyo_session_until';

export function buildKriyoSessionCookie(expiresAt = getNextLocalMidnight()) {
  return `${KRIYO_SESSION_COOKIE}=1; Path=${APP_BASE_PATH}; Expires=${expiresAt.toUTCString()}; SameSite=Lax`;
}

export function clearKriyoSessionCookie() {
  return `${KRIYO_SESSION_COOKIE}=; Path=${APP_BASE_PATH}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export function hasKriyoSessionCookie(cookieHeader: string | null | undefined) {
  return Boolean(cookieHeader?.split(';').some((part) => part.trim().startsWith(`${KRIYO_SESSION_COOKIE}=`)));
}
