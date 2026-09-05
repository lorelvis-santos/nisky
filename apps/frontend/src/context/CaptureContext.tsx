"use client";

import { createContext, useContext, useState } from "react";
import type { CaptureMode } from "@/features/quicknotes/components/CaptureComposer";

type CaptureContextValue = {
  isOpen: boolean;
  mode: CaptureMode;
  open: (mode?: CaptureMode) => void;
  close: () => void;
};

const CaptureContext = createContext<CaptureContextValue | null>(null);

export function CaptureProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<CaptureMode>("TASK");

  const open = (nextMode: CaptureMode = "TASK") => {
    setMode(nextMode);
    setIsOpen(true);
  };

  return <CaptureContext.Provider value={{ close: () => setIsOpen(false), isOpen, mode, open }}>{children}</CaptureContext.Provider>;
}

export function useCapture() {
  const context = useContext(CaptureContext);
  if (!context) throw new Error("useCapture debe usarse dentro de CaptureProvider");
  return context;
}
