import { getKriyoDb, type KriyoQueuedMutationRecord } from '@/lib/db';

export async function enqueueMutation(type: string, payload: unknown) {
  const db = await getKriyoDb();
  const item: KriyoQueuedMutationRecord = {
    id: crypto.randomUUID(),
    type,
    payload,
    createdAt: new Date().toISOString()
  };

  await db.put('queue', item);
  return item;
}

export async function listQueuedMutations() {
  const db = await getKriyoDb();
  return (await db.getAll('queue')).sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function removeQueuedMutation(id: string) {
  const db = await getKriyoDb();
  await db.delete('queue', id);
}

export async function clearQueuedMutations() {
  const db = await getKriyoDb();
  await db.clear('queue');
}

export async function flushQueuedMutations(
  executor: (item: KriyoQueuedMutationRecord) => Promise<void>
) {
  const db = await getKriyoDb();
  const items = await listQueuedMutations();

  for (const item of items) {
    await executor(item);
    await db.delete('queue', item.id);
  }

  return items.length;
}
