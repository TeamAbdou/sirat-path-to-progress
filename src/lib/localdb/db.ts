import Dexie, { type Table } from 'dexie';
import type { EncryptedBlob } from './crypto';

/**
 * Local IndexedDB schema. Sensitive text fields are stored as encrypted blobs
 * (iv + ciphertext) and decrypted on read by the repository layer.
 */

export interface MessageRow {
  id?: number;
  challengeId: string;
  role: 'user' | 'assistant';
  // encrypted content
  iv: Uint8Array;
  ct: ArrayBuffer;
  createdAt: number;
}

export interface ProgressRow {
  challengeId: string; // primary key
  daysClean: number;
  currentStreak: number;
  bestStreak: number;
  tipsFollowed: number;
  lastMarked: string | null; // YYYY-MM-DD
  updatedAt: number;
}

export interface BadgeRow {
  badgeId: string; // primary key
  awardedAt: number;
}

export interface PreferenceRow {
  key: string; // primary key (e.g. "displayName", "disclaimerAccepted")
  // Stored as encrypted blob OR raw value depending on key sensitivity
  iv?: Uint8Array;
  ct?: ArrayBuffer;
  raw?: unknown;
}

export interface MetaRow {
  key: string; // primary key
  value: unknown; // CryptoKey or scalar
}

class SiratLocalDB extends Dexie {
  messages!: Table<MessageRow, number>;
  progress!: Table<ProgressRow, string>;
  badges!: Table<BadgeRow, string>;
  preferences!: Table<PreferenceRow, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super('sirat-local');
    this.version(1).stores({
      messages: '++id, challengeId, createdAt',
      progress: 'challengeId, updatedAt',
      badges: 'badgeId, awardedAt',
      preferences: 'key',
      meta: 'key',
    });
  }
}

export const db = new SiratLocalDB();

// Types re-export for convenience
export type { EncryptedBlob };
