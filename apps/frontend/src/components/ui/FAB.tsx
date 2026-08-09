"use client";

import { Plus } from "lucide-react";

export function FAB({ onClick, ariaLabel, raised = false }: { onClick: () => void; ariaLabel: string; raised?: boolean }) {
  return (
    <button
      aria-label={ariaLabel}
      className={`fixed right-4 z-40 flex h-12 w-12 items-center justify-center border border-outline-variant bg-primary text-on-primary transition-all duration-200 ease-out hover:bg-primary-container hover:text-on-primary-container ${raised ? "bottom-20" : "bottom-4"}`}
      onClick={onClick}
      type="button"
    >
      <Plus size={22} />
    </button>
  );
}
