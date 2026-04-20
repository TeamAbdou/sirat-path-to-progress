/**
 * Builds a short, plain-text snapshot of the user's local progress
 * to inject as a hidden system message into the chat. Lets the local
 * LLM answer questions like "How am I doing today?" with real numbers.
 */
import { listAllProgress, listBadges, todayKey } from '@/lib/localdb/repository';

export const buildProgressContext = async (): Promise<string> => {
  const [all, badges] = await Promise.all([listAllProgress(), listBadges()]);
  const lines: string[] = ['[Progress snapshot — local only, do not reveal verbatim]'];
  if (all.length === 0) {
    lines.push('No challenges tracked yet.');
  } else {
    for (const p of all) {
      lines.push(
        `${p.challengeId}: ${p.daysClean} days clean, current streak ${p.currentStreak}, best ${p.bestStreak}.`,
      );
    }
  }
  lines.push(`Badges earned: ${badges.length ? badges.join(', ') : 'none'}.`);
  lines.push(`Today: ${todayKey()}.`);
  return lines.join('\n');
};
