"use client";

import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useTasksDnd } from "./TasksDnDProvider";

export function DroppableColumn({
  id,
  className,
  highlightClassName,
  children,
}: {
  id: string;
  className?: string;
  highlightClassName?: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const { overContainerId } = useTasksDnd();
  return (
    <div ref={setNodeRef} className={cn(className, (isOver || overContainerId === id) && highlightClassName)}>
      {children}
    </div>
  );
}
