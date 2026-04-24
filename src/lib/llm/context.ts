/**
 * Builds a short, plain-text snapshot of the user's local progress
 * (and optionally a trusted hadith block) to inject as a hidden system
 * message into the chat. Lets the local LLM answer with real numbers
 * and cite only verified Prophetic narrations.
 */
import { listAllProgress, listBadges, listMessages, todayKey } from '@/lib/localdb/repository';
import { getPreferenceRaw } from '@/lib/localdb/repository';
import { detectMood } from './mood-detector';
import { pickHadithForMood, formatHadithForContext, hasHadiths } from '@/lib/hadith-bank';

interface BuildOpts {
  challengeId?: string;
}

export const buildProgressContext = async (opts: BuildOpts = {}): Promise<string> => {
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

  // Spiritual layer — only if user opted in AND we actually have hadiths.
  const isMuslim = await getPreferenceRaw<boolean>('isMuslim').catch(() => false);
  if (isMuslim && hasHadiths()) {
    let recentText = '';
    if (opts.challengeId) {
      try {
        const recent = await listMessages(opts.challengeId, 3);
        recentText = recent.filter(m => m.role === 'user').map(m => m.content).join(' ');
      } catch { /* ignore */ }
    }
    const mood = detectMood({ recentUserText: recentText, progress: all });
    const picks = pickHadithForMood(mood, 1);
    if (picks.length > 0) {
      lines.push('');
      lines.push('[Trusted Hadith Bank — verbatim only, do NOT paraphrase, do NOT add others]');
      for (const h of picks) lines.push(formatHadithForContext(h));
    }
  }

  return lines.join('\n');
};
