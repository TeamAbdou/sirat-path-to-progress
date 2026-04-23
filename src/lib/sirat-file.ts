/**
 * .sirat file = full encrypted snapshot of the local IndexedDB.
 *
 * The CryptoKey itself is non-extractable, so we cannot move the AES key
 * across devices. Instead, we re-encrypt all sensitive blobs with a fresh
 * password-derived key (PBKDF2 → AES-GCM) chosen by the user at export
 * time. On import, the user supplies the same password to decrypt and
 * re-encrypt with the local device key.
 *
 * Plain (non-sensitive) tables (progress counters, badges, daily-entry
 * status flags) ride along in cleartext because they reveal nothing on
 * their own. Message bodies and notes stay encrypted end-to-end.
 */
import { db } from './localdb/db';
import { decryptString, encryptString } from './localdb/crypto';

const FILE_MAGIC = 'SIRAT/1';
const PBKDF2_ITERS = 200_000;

const enc = new TextEncoder();
const dec = new TextDecoder();

const b64encode = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
};
const b64decode = (s: string): Uint8Array => {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const deriveKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password) as BufferSource,
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

interface SnapshotMessage { challengeId: string; role: 'user' | 'assistant'; content: string; createdAt: number }
interface SnapshotEntry { challengeId: string; date: string; status: 'clean' | 'relapse'; note?: string; createdAt: number }
interface Snapshot {
  messages: SnapshotMessage[];
  progress: Array<{ challengeId: string; daysClean: number; currentStreak: number; bestStreak: number; tipsFollowed: number; lastMarked: string | null; updatedAt: number }>;
  badges: Array<{ badgeId: string; awardedAt: number }>;
  preferences: Array<{ key: string; raw?: unknown; encrypted?: string }>;
  dailyEntries: SnapshotEntry[];
  exportedAt: number;
}

const buildSnapshot = async (): Promise<Snapshot> => {
  const [msgRows, progressRows, badgeRows, prefRows, entryRows] = await Promise.all([
    db.messages.toArray(),
    db.progress.toArray(),
    db.badges.toArray(),
    db.preferences.toArray(),
    db.dailyEntries.toArray(),
  ]);

  const messages: SnapshotMessage[] = [];
  for (const r of msgRows) {
    try {
      const content = await decryptString({ iv: r.iv, ct: r.ct });
      messages.push({ challengeId: r.challengeId, role: r.role, content, createdAt: r.createdAt });
    } catch { /* skip */ }
  }

  const dailyEntries: SnapshotEntry[] = [];
  for (const r of entryRows) {
    let note: string | undefined;
    if (r.iv && r.ct) {
      try { note = await decryptString({ iv: r.iv, ct: r.ct }); } catch { /* skip */ }
    }
    dailyEntries.push({ challengeId: r.challengeId, date: r.date, status: r.status, note, createdAt: r.createdAt });
  }

  const preferences = await Promise.all(prefRows.map(async p => {
    if (p.iv && p.ct) {
      try { return { key: p.key, encrypted: await decryptString({ iv: p.iv, ct: p.ct }) }; }
      catch { return { key: p.key }; }
    }
    return { key: p.key, raw: p.raw };
  }));

  return {
    messages,
    progress: progressRows.map(p => ({
      challengeId: p.challengeId,
      daysClean: p.daysClean,
      currentStreak: p.currentStreak,
      bestStreak: p.bestStreak,
      tipsFollowed: p.tipsFollowed,
      lastMarked: p.lastMarked,
      updatedAt: p.updatedAt,
    })),
    badges: badgeRows.map(b => ({ badgeId: b.badgeId, awardedAt: b.awardedAt })),
    preferences,
    dailyEntries,
    exportedAt: Date.now(),
  };
};

/** Build an encrypted .sirat blob. */
export const exportSirat = async (password: string): Promise<Blob> => {
  if (password.length < 6) throw new Error('Password too short (min 6 chars).');
  const snapshot = await buildSnapshot();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    enc.encode(JSON.stringify(snapshot)) as BufferSource,
  );
  const envelope = {
    magic: FILE_MAGIC,
    kdf: 'PBKDF2-SHA256',
    iters: PBKDF2_ITERS,
    salt: b64encode(salt),
    iv: b64encode(iv),
    ct: b64encode(ct),
  };
  return new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/octet-stream' });
};

export interface SiratPreview {
  messages: number;
  entries: number;
  badges: number;
  challenges: number;
  exportedAt: number;
}

const decryptSnapshot = async (file: File, password: string): Promise<Snapshot> => {
  const text = await file.text();
  let envelope: { magic: string; salt: string; iv: string; ct: string };
  try { envelope = JSON.parse(text); }
  catch { throw new Error('Invalid file format.'); }
  if (envelope.magic !== FILE_MAGIC) throw new Error('Not a Sirat journey file.');

  const salt = b64decode(envelope.salt);
  const iv = b64decode(envelope.iv);
  const ct = b64decode(envelope.ct);
  const key = await deriveKey(password, salt);

  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, ct as BufferSource);
  } catch {
    throw new Error('Wrong password or corrupted file.');
  }
  return JSON.parse(dec.decode(plain)) as Snapshot;
};

/** Decrypt a .sirat file and return summary counts WITHOUT touching local DB. */
export const peekSirat = async (file: File, password: string): Promise<SiratPreview> => {
  const snap = await decryptSnapshot(file, password);
  const challenges = new Set<string>();
  snap.progress.forEach(p => challenges.add(p.challengeId));
  snap.messages.forEach(m => challenges.add(m.challengeId));
  return {
    messages: snap.messages.length,
    entries: snap.dailyEntries.length,
    badges: snap.badges.length,
    challenges: challenges.size,
    exportedAt: snap.exportedAt,
  };
};

/** Decrypt + restore a .sirat file. Existing rows are overwritten. */
export const importSirat = async (file: File, password: string): Promise<{ messages: number; entries: number; badges: number }> => {
  const snapshot = await decryptSnapshot(file, password);

  // Re-encrypt with this device's master key and write everything.
  await db.messages.clear();
  for (const m of snapshot.messages) {
    const blob = await encryptString(m.content);
    await db.messages.add({ challengeId: m.challengeId, role: m.role, iv: blob.iv, ct: blob.ct, createdAt: m.createdAt });
  }
  await db.progress.clear();
  for (const p of snapshot.progress) await db.progress.put({ ...p, updatedAt: p.updatedAt || Date.now() });

  await db.badges.clear();
  for (const b of snapshot.badges) await db.badges.put(b);

  await db.dailyEntries.clear();
  for (const e of snapshot.dailyEntries) {
    const row: { challengeId: string; date: string; status: 'clean' | 'relapse'; createdAt: number; iv?: Uint8Array; ct?: ArrayBuffer } = {
      challengeId: e.challengeId,
      date: e.date,
      status: e.status,
      createdAt: e.createdAt,
    };
    if (e.note) {
      const blob = await encryptString(e.note);
      row.iv = blob.iv;
      row.ct = blob.ct;
    }
    await db.dailyEntries.put(row);
  }

  // Preferences: keep existing master key, only restore non-sensitive raw + encrypted
  for (const p of snapshot.preferences) {
    if (p.encrypted !== undefined) {
      const blob = await encryptString(p.encrypted);
      await db.preferences.put({ key: p.key, iv: blob.iv, ct: blob.ct });
    } else if (p.raw !== undefined) {
      await db.preferences.put({ key: p.key, raw: p.raw });
    }
  }

  return { messages: snapshot.messages.length, entries: snapshot.dailyEntries.length, badges: snapshot.badges.length };
};
