/**
 * AES-GCM encryption layer for local-at-rest data.
 * The CryptoKey is generated once on first run and stored as a non-extractable
 * key inside the IndexedDB `meta` store. WebCrypto wraps the key so it can
 * never be read as raw bytes by app code.
 */

const KEY_NAME = 'sirat-master-key-v1';

let cachedKey: CryptoKey | null = null;

const getKeyFromMeta = async (): Promise<CryptoKey | null> => {
  // Lazy import to avoid a circular dep with db.ts
  const { db } = await import('./db');
  const row = await db.meta.get(KEY_NAME);
  return (row?.value as CryptoKey | undefined) ?? null;
};

const persistKey = async (key: CryptoKey) => {
  const { db } = await import('./db');
  await db.meta.put({ key: KEY_NAME, value: key });
};

export const getCryptoKey = async (): Promise<CryptoKey> => {
  if (cachedKey) return cachedKey;

  const existing = await getKeyFromMeta();
  if (existing) {
    cachedKey = existing;
    return existing;
  }

  // Generate a fresh AES-GCM 256 key. extractable=false so it cannot leave WebCrypto.
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  await persistKey(key);
  cachedKey = key;
  return key;
};

export interface EncryptedBlob {
  iv: Uint8Array;
  ct: ArrayBuffer;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

export const encryptString = async (plain: string): Promise<EncryptedBlob> => {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plain),
  );
  return { iv, ct };
};

export const decryptString = async (blob: EncryptedBlob): Promise<string> => {
  const key = await getCryptoKey();
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: blob.iv },
    key,
    blob.ct,
  );
  return dec.decode(pt);
};
