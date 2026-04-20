/**
 * Pure badge evaluation engine. Reads progress + entries snapshots and
 * returns the list of badge IDs the user qualifies for. The repository
 * decides which are actually new and persists them.
 */
import { BADGES } from '@/lib/badges';
import type { ProgressRow } from '@/lib/localdb/db';
import { listAllProgress, listBadges, awardBadge } from '@/lib/localdb/repository';

export interface EvaluateInput {
  progress: ProgressRow;
  allProgress: ProgressRow[];
}

export const evaluateBadges = ({ progress, allProgress }: EvaluateInput): string[] => {
  const earned = new Set<string>();

  if (progress.daysClean >= 1) earned.add('badge_day1');
  if (progress.tipsFollowed >= 5) earned.add('badge_5steps');
  if (progress.currentStreak >= 7 || progress.bestStreak >= 7) {
    earned.add('badge_week_stable');
    earned.add('badge_7days_purity');
  }
  if (progress.currentStreak >= 30 || progress.bestStreak >= 30) {
    earned.add('badge_month_purity');
  }
  // Spiritual return: 7-day streak on the prayer challenge
  const pray = allProgress.find(p => p.challengeId === 'notPraying');
  if (pray && (pray.currentStreak >= 7 || pray.bestStreak >= 7)) {
    earned.add('badge_return_spiritual');
  }

  // Only return IDs that exist in BADGES
  const valid = new Set(BADGES.map(b => b.id));
  return [...earned].filter(id => valid.has(id));
};

/**
 * Compare with already-awarded badges, persist the new ones, and
 * return the newly-awarded badge IDs (caller can show toasts).
 */
export const awardNewBadges = async (progress: ProgressRow): Promise<string[]> => {
  const [allProgress, alreadyEarned] = await Promise.all([listAllProgress(), listBadges()]);
  const qualified = evaluateBadges({ progress, allProgress });
  const already = new Set(alreadyEarned);
  const fresh = qualified.filter(id => !already.has(id));
  await Promise.all(fresh.map(id => awardBadge(id)));
  return fresh;
};
