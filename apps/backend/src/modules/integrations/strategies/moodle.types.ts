export type MoodleResult =
  | { ok: true; count?: number; token?: string; events?: Record<string, unknown>[] }
  | { ok: false; error: string };
