import { KEY_TTL_MS } from "./crypto";

interface StoredJournalKey {
  key: Uint8Array;
  userId: string;
  expiresAt: number;
}

const store = new Map<string, StoredJournalKey>();

export function storeJournalKey(refreshTokenId: string, userId: string, key: Uint8Array) {
  store.set(refreshTokenId, { key, userId, expiresAt: Date.now() + KEY_TTL_MS });
}

export function getJournalKey(refreshTokenId: string, userId: string) {
  const entry = store.get(refreshTokenId);
  if (!entry || entry.userId !== userId) return undefined;
  if (entry.expiresAt <= Date.now()) {
    store.delete(refreshTokenId);
    return undefined;
  }
  return entry.key;
}

export function dropJournalKey(refreshTokenId: string) {
  store.delete(refreshTokenId);
}

export function migrateJournalKey(oldRefreshTokenId: string, newRefreshTokenId: string, userId: string) {
  const entry = store.get(oldRefreshTokenId);
  if (!entry || entry.userId !== userId) return;
  store.delete(oldRefreshTokenId);
  store.set(newRefreshTokenId, entry);
}

export function dropJournalKeysForUser(userId: string, exceptRefreshTokenId?: string) {
  for (const [id, entry] of store) {
    if (entry.userId === userId && id !== exceptRefreshTokenId) store.delete(id);
  }
}

export function journalKeyCount() {
  return store.size;
}
