import { prisma } from "../../infra/prisma/client";

const CACHE_TTL_MS = 60 * 1000;

let cached: { value: boolean; expiresAt: number } | null = null;

export function clearPublicSignupCache() {
  cached = null;
}

export async function getPublicSignup(): Promise<boolean> {
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const setting = await prisma.setting.findUnique({ where: { key: "publicSignup" } });
  const value = setting?.value === "true";
  cached = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}
