"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface TasksSidebarContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
}

const TasksSidebarContext = createContext<TasksSidebarContextValue | null>(null);

export function TasksSidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("agenda:tasksSidebar");
    if (stored !== null) {
      // Hydrate the client preference after SSR without changing the server markup.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpen(stored === "true");
    }
  }, []);

  const setOpen = (open: boolean) => {
    setIsOpen(open);
    localStorage.setItem("agenda:tasksSidebar", String(open));
  };

  const toggle = () => {
    setIsOpen((open) => {
      const next = !open;
      localStorage.setItem("agenda:tasksSidebar", String(next));
      return next;
    });
  };

  return (
    <TasksSidebarContext.Provider value={{ isOpen, setIsOpen: setOpen, toggle }}>
      {children}
    </TasksSidebarContext.Provider>
  );
}

export function useTasksSidebar() {
  const ctx = useContext(TasksSidebarContext);
  if (!ctx) throw new Error("useTasksSidebar debe usarse dentro de TasksSidebarProvider");
  return ctx;
}
