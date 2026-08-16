"use client";

import { useEffect } from 'react';
import { APP_BASE_PATH } from '@/lib/app-config';

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) return;

    navigator.serviceWorker.register(`${APP_BASE_PATH}/sw.js`, {
      scope: `${APP_BASE_PATH}/`
    }).catch(() => undefined);
  }, []);

  return null;
}
