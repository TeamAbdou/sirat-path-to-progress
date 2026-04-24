/**
 * Hadith Bank — Trusted, immutable corpus.
 *
 * ⚠️  PRINCIPLE: NEVER let the AI generate or paraphrase a hadith.
 * Only verbatim entries from this file may be cited.
 *
 * Sources allowed: صحيح البخاري (Sahih al-Bukhari) و صحيح مسلم (Sahih Muslim) فقط.
 *
 * To add a hadith: paste the exact Arabic text + canonical number from the
 * source. Do NOT translate, summarize, or modernize. Tag it with one or
 * more moods so the mood-detector can surface it at the right moment.
 */

export type HadithMood =
  | 'patience'    // صبر، احتمال الابتلاء
  | 'hope'       // أمل، رحمة الله
  | 'discipline' // انضباط، مجاهدة النفس
  | 'intention'  // نية، إخلاص
  | 'repentance';// توبة، تجاوز الزلّة

export type HadithSource = 'Bukhari' | 'Muslim';

export interface Hadith {
  /** Stable id, e.g. "bukhari-6116" */
  id: string;
  /** Verbatim Arabic text — copied from source, never edited. */
  arabic: string;
  source: HadithSource;
  /** Canonical hadith number in the named source. */
  number: number;
  moods: HadithMood[];
}

/**
 * The bank itself. INTENTIONALLY EMPTY.
 *
 * The user must supply texts manually (with source + number) so we never risk
 * misquoting a Prophetic narration. Until filled, the spiritual injection
 * layer simply does not include any hadith block — the AI is instructed to
 * never invent one as a fallback.
 */
export const HADITH_BANK: readonly Hadith[] = [
  // TODO(user): Paste authenticated entries here.
  // Example shape (do NOT use this filler in production):
  // {
  //   id: 'bukhari-1',
  //   arabic: 'إنما الأعمال بالنيات…',
  //   source: 'Bukhari',
  //   number: 1,
  //   moods: ['intention'],
  // },
];

const SOURCE_LABEL_AR: Record<HadithSource, string> = {
  Bukhari: 'صحيح البخاري',
  Muslim: 'صحيح مسلم',
};

/** Pick up to `count` hadiths matching the given mood (deterministic order). */
export const pickHadithForMood = (mood: HadithMood, count = 1): Hadith[] => {
  if (HADITH_BANK.length === 0) return [];
  const matches = HADITH_BANK.filter(h => h.moods.includes(mood));
  return matches.slice(0, count);
};

/** Format a hadith for verbatim injection into the LLM context. */
export const formatHadithForContext = (h: Hadith): string =>
  `- "${h.arabic}" — ${SOURCE_LABEL_AR[h.source]} #${h.number}`;

export const hasHadiths = (): boolean => HADITH_BANK.length > 0;
