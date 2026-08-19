"use client";

import { useEffect } from 'react';
import { syncQueuedMutations } from '@/lib/sync/client';

export function SyncQueueBootstrap() {
  useEffect(() => {
    let cancelled = false;

    async function flushQueue() {
      if (cancelled || !navigator.onLine) {
        return;
      }

      try {
        await syncQueuedMutations();
      } catch {
        // The queue stays intact and will retry on the next mount or online event.
      }
    }

    void flushQueue();

    const handleOnline = () => {
      void flushQueue();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      cancelled = true;
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return null;
}
