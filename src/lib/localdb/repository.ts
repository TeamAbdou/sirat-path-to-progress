import { db, type MessageRow, type ProgressRow, type DailyEntryRow } from './db';
import { encryptString, decryptString } from './crypto';

/* ------------------------------ Profile ------------------------------ */

const PROFILE_ID_KEY = 'profileId';

const uuid = (): string => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const getOrCreateProfileId = async (): Promise<string> => {
  const row = await db.meta.get(PROFILE_ID_KEY);
  if (row?.value) return row.value as string;
  const id = uuid();
  await db.meta.put({ key: PROFILE_ID_KEY, value: id });
  return id;
};

/* ------------------------------ Messages ------------------------------ */

export interface DecryptedMessage {
  id: number;
  challengeId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export const addMessage = async (
  challengeId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<number> => {
  const { iv, ct } = await encryptString(content);
  const row: MessageRow = { challengeId, role, iv, ct, createdAt: Date.now() };
  return await db.messages.add(row);
};

export const listMessages = async (
  challengeId: string,
  limit = 100,
): Promise<DecryptedMessage[]> => {
  const rows = await db.messages.where('challengeId').equals(challengeId).sortBy('createdAt');
  const sliced = rows.slice(-limit);
  const out: DecryptedMessage[] = [];
  for (const r of sliced) {
    try {
      const content = await decryptString({ iv: r.iv, ct: r.ct });
      out.push({ id: r.id!, challengeId: r.challengeId, role: r.role, content, createdAt: r.createdAt });
    } catch {
      // skip corrupted row
    }
  }
  return out;
};

export const clearMessages = async (challengeId?: string) => {
  if (challengeId) {
    await db.messages.where('challengeId').equals(challengeId).delete();
  } else {
    await db.messages.clear();
  }
};

/* ------------------------------ Progress ------------------------------ */

export const getProgress = async (challengeId: string): Promise<ProgressRow> => {
  const existing = await db.progress.get(challengeId);
  if (existing) return existing;
  return {
    challengeId,
    daysClean: 0,
    currentStreak: 0,
    bestStreak: 0,
    tipsFollowed: 0,
    lastMarked: null,
    updatedAt: Date.now(),
  };
};

export const upsertProgress = async (row: Omit<ProgressRow, 'updatedAt'>) => {
  await db.progress.put({ ...row, updatedAt: Date.now() });
};

export const resetProgress = async (challengeId: string) => {
  await db.progress.put({
    challengeId,
    daysClean: 0,
    currentStreak: 0,
    bestStreak: 0,
    tipsFollowed: 0,
    lastMarked: null,
    updatedAt: Date.now(),
  });
  await db.dailyEntries.where('challengeId').equals(challengeId).delete();
};

export const listAllProgress = async (): Promise<ProgressRow[]> => {
  return await db.progress.toArray();
};

/* ------------------------------ Daily entries ------------------------------ */

export interface DailyEntryView {
  challengeId: string;
  date: string;
  status: 'clean' | 'relapse';
  note?: string;
  createdAt: number;
}

/** Local YYYY-MM-DD (device timezone). */
export const todayKey = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDays = (key: string, delta: number): string => {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return todayKey(dt);
};

/**
 * Recompute progress summary from dailyEntries.
 * - daysClean   = total clean days
 * - currentStreak = consecutive clean days ending at the most recent clean day
 *                   that is today or yesterday (broken by relapse or gap >1).
 * - bestStreak  = longest run of consecutive clean days in history.
 */
export const recomputeProgress = async (challengeId: string): Promise<ProgressRow> => {
  const entries = await db.dailyEntries.where('challengeId').equals(challengeId).toArray();
  entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let daysClean = 0;
  let bestStreak = 0;
  let runningStreak = 0;
  let prevDate: string | null = null;

  for (const e of entries) {
    if (e.status === 'clean') {
      daysClean += 1;
      if (prevDate && addDays(prevDate, 1) === e.date) {
        runningStreak += 1;
      } else {
        runningStreak = 1;
      }
      if (runningStreak > bestStreak) bestStreak = runningStreak;
    } else {
      runningStreak = 0;
    }
    prevDate = e.date;
  }

  // Current streak: only valid if the last clean day is today or yesterday
  // and the trailing tail is unbroken cleans.
  let currentStreak = 0;
  const today = todayKey();
  const yesterday = addDays(today, -1);
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.status !== 'clean') break;
    if (currentStreak === 0) {
      if (e.date !== today && e.date !== yesterday) break;
      currentStreak = 1;
    } else {
      const expected = addDays(entries[i + 1].date, -1);
      if (e.date !== expected) break;
      currentStreak += 1;
    }
  }

  const lastMarked = entries.length ? entries[entries.length - 1].date : null;
  const existing = await db.progress.get(challengeId);
  const tipsFollowed = existing?.tipsFollowed ?? 0;

  const next: ProgressRow = {
    challengeId,
    daysClean,
    currentStreak,
    bestStreak,
    tipsFollowed,
    lastMarked,
    updatedAt: Date.now(),
  };
  await db.progress.put(next);
  return next;
};

export const markDay = async (
  challengeId: string,
  date: string,
  status: 'clean' | 'relapse',
  note?: string,
): Promise<ProgressRow> => {
  const row: DailyEntryRow = { challengeId, date, status, createdAt: Date.now() };
  if (note) {
    const { iv, ct } = await encryptString(note);
    row.iv = iv;
    row.ct = ct;
  }
  await db.dailyEntries.put(row);
  return await recomputeProgress(challengeId);
};

export const listEntries = async (
  challengeId: string,
  fromDate?: string,
  toDate?: string,
): Promise<DailyEntryView[]> => {
  let coll = db.dailyEntries.where('challengeId').equals(challengeId);
  const rows = await coll.toArray();
  const filtered = rows.filter(r => {
    if (fromDate && r.date < fromDate) return false;
    if (toDate && r.date > toDate) return false;
    return true;
  });
  filtered.sort((a, b) => (a.date < b.date ? -1 : 1));
  const out: DailyEntryView[] = [];
  for (const r of filtered) {
    let note: string | undefined;
    if (r.iv && r.ct) {
      try { note = await decryptString({ iv: r.iv, ct: r.ct }); } catch { /* skip */ }
    }
    out.push({ challengeId: r.challengeId, date: r.date, status: r.status, note, createdAt: r.createdAt });
  }
  return out;
};

export const incrementTipsFollowed = async (challengeId: string): Promise<ProgressRow> => {
  const cur = await getProgress(challengeId);
  const next = { ...cur, tipsFollowed: cur.tipsFollowed + 1, updatedAt: Date.now() };
  await db.progress.put(next);
  return next;
};

/* ------------------------------ Badges ------------------------------ */

export const listBadges = async (): Promise<string[]> => {
  const rows = await db.badges.toArray();
  return rows.map(r => r.badgeId);
};

export const awardBadge = async (badgeId: string) => {
  await db.badges.put({ badgeId, awardedAt: Date.now() });
};

/* ------------------------------ Preferences ------------------------------ */

export const setPreferenceRaw = async (key: string, value: unknown) => {
  await db.preferences.put({ key, raw: value });
};

export const getPreferenceRaw = async <T = unknown>(key: string): Promise<T | undefined> => {
  const row = await db.preferences.get(key);
  return row?.raw as T | undefined;
};

export const setPreferenceEncrypted = async (key: string, value: string) => {
  const { iv, ct } = await encryptString(value);
  await db.preferences.put({ key, iv, ct });
};

export const getPreferenceEncrypted = async (key: string): Promise<string | undefined> => {
  const row = await db.preferences.get(key);
  if (!row?.iv || !row?.ct) return undefined;
  try {
    return await decryptString({ iv: row.iv, ct: row.ct });
  } catch {
    return undefined;
  }
};
