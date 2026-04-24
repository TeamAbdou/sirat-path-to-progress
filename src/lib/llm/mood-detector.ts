/**
 * Lightweight, deterministic mood detector.
 * No model — just keyword matching across the user's recent messages
 * + their progress signals. Used to choose which trusted hadith to inject.
 */
import type { HadithMood } from '@/lib/hadith-bank';
import type { ProgressRow } from '@/lib/localdb/db';

interface DetectInput {
  recentUserText: string;
  progress?: ProgressRow[];
}

const KEYWORDS: Record<HadithMood, RegExp> = {
  repentance: /(انتكس|رجعت|ذنب|تبت|توبة|أذنبت|relapse|sinned|guilty|ashamed)/i,
  hope: /(يأس|محبط|تعبت|ما في فايدة|hopeless|giving up|lost|despair)/i,
  patience: /(صبر|ابتلاء|تعب|ألم|patience|hard|struggling|painful)/i,
  discipline: /(نفسي|شهوة|إغراء|أقاوم|temptation|urge|craving|fight)/i,
  intention: /(نية|أبدأ|بداية|أريد|قرار|intention|decide|start|commit)/i,
};

export const detectMood = ({ recentUserText, progress }: DetectInput): HadithMood => {
  // Progress-based override: a fresh relapse outweighs words.
  if (progress?.length) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recentRelapse = progress.some(p => {
      if (!p.lastMarked) return false;
      // currentStreak === 0 + recently marked = recently broken
      return p.currentStreak === 0 && p.daysClean > 0;
    });
    if (recentRelapse) return 'hope';
  }

  for (const [mood, re] of Object.entries(KEYWORDS) as [HadithMood, RegExp][]) {
    if (re.test(recentUserText)) return mood;
  }
  return 'patience';
};
