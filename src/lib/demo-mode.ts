/**
 * Demo Mode — one-click seeding with realistic-but-fake journey data.
 * Used for screenshots, presentations, and reviewer walkthroughs.
 *
 * Seeds: a 21-day daily-entry history with 2 minor relapses for one
 * challenge ("pornography"), plus a few badges and a display name.
 * Recomputes streaks via the real progress engine so numbers are honest.
 */
import { db } from './localdb/db';
import {
  markDay,
  awardBadge,
  setPreferenceEncrypted,
  setPreferenceRaw,
  recomputeProgress,
  todayKey,
} from './localdb/repository';

const DEMO_FLAG_KEY = 'demoModeOn';
const DEMO_CHALLENGE = 'pornography';

const offsetDate = (key: string, delta: number): string => {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

export const isDemoModeOn = async (): Promise<boolean> => {
  const row = await db.preferences.get(DEMO_FLAG_KEY);
  return !!row?.raw;
};

/** Wipe everything, then seed a believable 21-day journey. */
export const enableDemoMode = async (): Promise<void> => {
  // Hard reset
  await Promise.all([
    db.messages.clear(),
    db.progress.clear(),
    db.badges.clear(),
    db.dailyEntries.clear(),
  ]);
  // Keep meta (encryption key) intact so encryption still works.

  const today = todayKey();

  // 21-day pattern: . = clean, X = relapse. Index 0 = 20 days ago, 20 = today.
  // Two relapses on day 6 and day 12 (typical "real" recovery curve).
  const pattern = '.....X.....X........';
  for (let i = 0; i < pattern.length; i++) {
    const date = offsetDate(today, -(pattern.length - 1 - i));
    const status = pattern[i] === 'X' ? 'relapse' : 'clean';
    await markDay(DEMO_CHALLENGE, date, status);
  }

  // Add today as clean for a fresh-feeling streak
  await markDay(DEMO_CHALLENGE, today, 'clean');

  await recomputeProgress(DEMO_CHALLENGE);

  // Sample badges
  await awardBadge('badge_day1');
  await awardBadge('badge_5steps');

  // Display name
  await setPreferenceEncrypted('displayName', 'Sirat Demo');
  await setPreferenceRaw('isMuslim', true);
  await setPreferenceRaw('onboardingDone', true);
  await setPreferenceRaw(DEMO_FLAG_KEY, true);
};

export const disableDemoMode = async (): Promise<void> => {
  await Promise.all([
    db.messages.clear(),
    db.progress.clear(),
    db.badges.clear(),
    db.dailyEntries.clear(),
  ]);
  await setPreferenceRaw(DEMO_FLAG_KEY, false);
};
