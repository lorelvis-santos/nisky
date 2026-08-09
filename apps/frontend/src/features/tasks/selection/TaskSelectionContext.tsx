"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type TaskSelectionValue = {
  mode: boolean;
  selectedIds: Set<string>;
  isSelected: (taskId: string) => boolean;
  toggleSelect: (taskId: string) => void;
  setMode: (mode: boolean) => void;
  clear: () => void;
};

const TaskSelectionContext = createContext<TaskSelectionValue | null>(null);

export function TaskSelectionProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const toggleSelect = useCallback((taskId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
    setMode(false);
  }, []);

  const value = useMemo<TaskSelectionValue>(
    () => ({
      mode,
      selectedIds,
      isSelected: (taskId: string) => mode && selectedIds.has(taskId),
      toggleSelect,
      setMode,
      clear,
    }),
    [mode, selectedIds, toggleSelect, clear],
  );

  return <TaskSelectionContext.Provider value={value}>{children}</TaskSelectionContext.Provider>;
}

export function useTaskSelection() {
  const value = useContext(TaskSelectionContext);
  if (!value) throw new Error("useTaskSelection debe usarse dentro de <TaskSelectionProvider>");
  return value;
}