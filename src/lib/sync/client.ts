import { flushQueuedMutations } from '@/lib/sync/queue';
import { persistQueuedMutation } from '@/lib/sync/server';

let activeSync: Promise<number> | null = null;

export function syncQueuedMutations() {
  if (!activeSync) {
    activeSync = flushQueuedMutations(async (item) => {
      const result = await persistQueuedMutation(item);
      if (!result.ok) {
        throw new Error(result.message);
      }
    }).finally(() => {
      activeSync = null;
    });
  }

  return activeSync;
}
