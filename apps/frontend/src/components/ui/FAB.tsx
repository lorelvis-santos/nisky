"use client";

import { Plus } from "lucide-react";

export function FAB({ onClick, ariaLabel, raised = false }: { onClick: () => void; ariaLabel: string; raised?: boolean }) {
  return (
    <button
      aria-label={ariaLabel}
      className={`fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-primary-container bg-primary text-on-primary shadow-cadence-3 transition-all duration-200 ease-out hover:bg-primary-container hover:text-on-primary-container active:scale-[0.98] ${raised ? "bottom-[calc(8.75rem+env(safe-area-inset-bottom,0px))]" : "bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))]"}`}
      onClick={onClick}
      type="button"
    >
      <Plus size={22} />
    </button>
  );
}
