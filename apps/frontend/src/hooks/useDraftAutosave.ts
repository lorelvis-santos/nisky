import { useEffect, useRef, useState } from "react";

export type DraftAutosaveState = "idle" | "saving" | "saved" | "error";

interface UseDraftAutosaveOptions<TLoad, TPayload> {
  load: () => Promise<TLoad | null | undefined>;
  save: (payload: TPayload) => Promise<void>;
  clear: () => Promise<void>;
  isDirty: (payload: TLoad) => boolean;
  delay?: number;
}

export function useDraftAutosave<TLoad, TPayload>({ load, save, clear, isDirty, delay = 800 }: UseDraftAutosaveOptions<TLoad, TPayload>) {
  const [restored, setRestored] = useState<TLoad | null>(null);
  const [state, setState] = useState<DraftAutosaveState>("idle");
  const payloadRef = useRef<TPayload | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = async () => {
    const payload = payloadRef.current;
    if (!payload) return;
    try {
      await save(payload);
      setState("saved");
    } catch {
      setState("error");
    }
  };

  const update = (payload: TPayload) => {
    payloadRef.current = payload;
    if (timerRef.current) clearTimeout(timerRef.current);
    setState("saving");
    timerRef.current = setTimeout(() => void persist(), delay);
  };

  const discard = async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    payloadRef.current = null;
    await clear().catch(() => {});
    setRestored(null);
    setState("idle");
  };

  useEffect(() => {
    void load().then((draft) => {
      if (draft && isDirty(draft)) setRestored(draft);
    });
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        void persist();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { restored, state, update, discard };
}