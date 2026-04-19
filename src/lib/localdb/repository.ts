import { db, type MessageRow, type ProgressRow } from './db';
import { encryptString, decryptString } from './crypto';

/* ------------------------------ Profile ------------------------------ */

const PROFILE_ID_KEY = 'profileId';

const uuid = (): string => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // Fallback
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
  const row: MessageRow = {
    challengeId,
    role,
    iv,
    ct,
    createdAt: Date.now(),
  };
  return await db.messages.add(row);
};

export const listMessages = async (
  challengeId: string,
  limit = 100,
): Promise<DecryptedMessage[]> => {
  const rows = await db.messages
    .where('challengeId')
    .equals(challengeId)
    .sortBy('createdAt');
  const sliced = rows.slice(-limit);
  const out: DecryptedMessage[] = [];
  for (const r of sliced) {
    try {
      const content = await decryptString({ iv: r.iv, ct: r.ct });
      out.push({
        id: r.id!,
        challengeId: r.challengeId,
        role: r.role,
        content,
        createdAt: r.createdAt,
      });
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
