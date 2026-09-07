import { getKriyoDb, type KriyoGamificationRecord } from '@/lib/db';

export const XP_PER_PERFECT_SETUP = 100;
export const XP_PER_LEVEL = 500;

export type RankKey = 'novice' | 'disciplined' | 'sniper' | 'elite';

interface RankTier {
  key: RankKey;
  minSetups: number;
}

const RANK_TIERS: RankTier[] = [
  { key: 'novice', minSetups: 0 },
  { key: 'disciplined', minSetups: 5 },
  { key: 'sniper', minSetups: 15 },
  { key: 'elite', minSetups: 30 }
];

function getGamificationId(userId: string) {
  return `gamification-${userId}`;
}

export function getRankForSetupCount(perfectSetupsCount: number): { rank: RankKey; nextThreshold: number | null } {
  let current: RankTier = RANK_TIERS[0];
  for (const tier of RANK_TIERS) {
    if (perfectSetupsCount >= tier.minSetups) {
      current = tier;
    }
  }
  const nextTier = RANK_TIERS.find((tier) => tier.minSetups > current.minSetups);
  return { rank: current.key, nextThreshold: nextTier ? nextTier.minSetups : null };
}

export function getLevelForXp(xp: number) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export async function getGamificationStats(userId: string): Promise<KriyoGamificationRecord> {
  const db = await getKriyoDb();
  const existing = await db.get('gamification', getGamificationId(userId));
  if (existing) return existing;

  return {
    id: getGamificationId(userId),
    userId,
    xp: 0,
    perfectSetupsCount: 0,
    currentStreak: 0,
    bestStreak: 0,
    updatedAt: new Date().toISOString()
  };
}

export async function recordPerfectSetupExecuted(userId: string): Promise<KriyoGamificationRecord> {
  const db = await getKriyoDb();
  const current = await getGamificationStats(userId);

  const updated: KriyoGamificationRecord = {
    ...current,
    xp: current.xp + XP_PER_PERFECT_SETUP,
    perfectSetupsCount: current.perfectSetupsCount + 1,
    currentStreak: current.currentStreak + 1,
    bestStreak: Math.max(current.bestStreak, current.currentStreak + 1),
    updatedAt: new Date().toISOString()
  };

  await db.put('gamification', updated);
  return updated;
}

export async function resetStreak(userId: string): Promise<KriyoGamificationRecord> {
  const db = await getKriyoDb();
  const current = await getGamificationStats(userId);
  const updated: KriyoGamificationRecord = { ...current, currentStreak: 0, updatedAt: new Date().toISOString() };
  await db.put('gamification', updated);
  return updated;
}
