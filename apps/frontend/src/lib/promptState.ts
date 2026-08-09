export const NOTIF_KEY = "nisky:prompt-notif";
export const INSTALL_KEY = "nisky:prompt-install";

export type PromptState = {
  dismissCount: number;
  dismissedAt: string | null;
  neverAsk: boolean;
};

export const EMPTY_PROMPT_STATE: PromptState = { dismissCount: 0, dismissedAt: null, neverAsk: false };

export function readPromptState(key: string): PromptState {
  if (typeof window === "undefined") return { ...EMPTY_PROMPT_STATE };
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return { ...EMPTY_PROMPT_STATE };
    return { ...EMPTY_PROMPT_STATE, ...(JSON.parse(raw) as Partial<PromptState>) };
  } catch {
    return { ...EMPTY_PROMPT_STATE };
  }
}

export function writePromptState(key: string, state: PromptState) {
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // privacidad: si el storage no está disponible, no rompemos nada
  }
}

export function resetPromptState(key: string) {
  writePromptState(key, { ...EMPTY_PROMPT_STATE });
}