"use client";

import { useEffect } from "react";

export function useModalScrollLock() {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const block = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-modal-scroll]")) return;
      event.preventDefault();
    };
    document.addEventListener("wheel", block, { passive: false });
    document.addEventListener("touchmove", block, { passive: false });
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("wheel", block);
      document.removeEventListener("touchmove", block);
    };
  }, []);
}
