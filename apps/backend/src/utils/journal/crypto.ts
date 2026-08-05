import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

export const KEY_LENGTH = 32;
export const IV_LENGTH = 12;
export const SALT_LENGTH = 16;
export const KEY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

export function deriveJournalKey(password: string, salt: Uint8Array) {
  return scryptSync(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);
}

export function newJournalSalt() {
  return randomBytes(SALT_LENGTH);
}

export function encryptJournalContent(content: string, key: Uint8Array) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(content, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    contentCipher: new Uint8Array(encrypted),
    iv: new Uint8Array(iv),
    authTag: new Uint8Array(authTag),
  };
}

export function decryptJournalContent(contentCipher: Uint8Array, iv: Uint8Array, authTag: Uint8Array, key: Uint8Array) {
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(Buffer.from(authTag));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(contentCipher)), decipher.final()]);
  return decrypted.toString("utf8");
}
