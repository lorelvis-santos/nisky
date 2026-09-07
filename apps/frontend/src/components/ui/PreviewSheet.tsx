"use client";

import type { ReactNode } from "react";
import { useRef, useState, type PointerEvent } from "react";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PreviewSheet({
  title,
  eyebrow,
  description,
  children,
  footer,
  headerExtra,
  eyebrowIcon: EyebrowIcon,
  onClose,
  wide = false,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  headerExtra?: ReactNode;
  eyebrowIcon?: LucideIcon;
  onClose: () => void;
  wide?: boolean;
}) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const dragOffsetRef = useRef(0);

  const handleDragStart = (event: PointerEvent<HTMLButtonElement>) => {
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    startYRef.current = event.clientY;
    dragOffsetRef.current = 0;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDragMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!isDragging || window.matchMedia("(min-width: 1024px)").matches) return;
    const delta = Math.max(0, event.clientY - startYRef.current);
    dragOffsetRef.current = delta;
    setDragOffset(delta);
  };

  const handleDragEnd = (event: PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (dragOffsetRef.current > 120) {
      onClose();
    } else {
      dragOffsetRef.current = 0;
      setDragOffset(0);
    }
  };

  return (
    <Dialog modal={false} open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className={cn(
          "fixed inset-x-0 bottom-0 left-0 right-0 top-auto z-50 flex h-[min(88dvh,48rem)] max-h-[88dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-b-none rounded-t-[1.75rem] border-outline-variant bg-surface-bright p-0 shadow-cadence-3 outline-none transition-transform duration-200 sm:max-w-none lg:inset-y-0 lg:bottom-0 lg:left-auto lg:right-0 lg:top-0 lg:h-full lg:max-h-full lg:rounded-l-2xl lg:rounded-r-none lg:rounded-t-none lg:shadow-[-8px_0_24px_-4px_rgba(15,23,42,0.06)]",
          wide ? "lg:w-[min(42rem,100vw)]" : "lg:w-[min(29rem,100vw)]",
          isDragging && "transition-none",
        )}
        style={dragOffset > 0 ? { transform: `translateY(${dragOffset}px)` } : undefined}
        data-preview-sheet="true"
        onInteractOutside={(event) => {
          if (!window.matchMedia("(min-width: 1024px)").matches) return;
          const target = event.target;
          if (target instanceof Element && target.closest('[data-preview-floating="true"]')) return;
          event.preventDefault();
        }}
        overlayClassName="preview-sheet-overlay lg:!pointer-events-none lg:bg-transparent lg:backdrop-blur-none"
        showCloseButton={false}
      >
        <button
          aria-label="Arrastrar para cerrar la vista previa"
          className="flex shrink-0 cursor-grab appearance-none select-none justify-center border-0 bg-transparent pt-3 touch-none active:cursor-grabbing lg:hidden"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          type="button"
        >
          <span className="h-1.5 w-14 rounded-full bg-outline-variant transition-opacity" style={{ opacity: isDragging ? 0.6 : 1 }} />
        </button>
        <DialogHeader className="flex shrink-0 flex-row items-start justify-between gap-4 border-b border-outline-variant px-5 py-4 text-left lg:px-6">
          <div className="min-w-0">
            {eyebrow && (EyebrowIcon ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-primary-fixed px-2.5 py-1 font-label-caps text-label-caps uppercase text-primary">
                <EyebrowIcon aria-hidden="true" size={14} />
                {eyebrow}
              </span>
            ) : (
              <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">{eyebrow}</p>
            ))}
            <DialogTitle className="mt-1 break-words text-xl leading-7">{title}</DialogTitle>
            {description && <DialogDescription className="mt-1 line-clamp-2">{description}</DialogDescription>}
          </div>
          <DialogClose asChild>
            <button
              aria-label="Cerrar vista previa"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
              type="button"
            >
              <X size={19} />
            </button>
          </DialogClose>
        </DialogHeader>
        {headerExtra}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 lg:px-6">{children}</div>
        {footer && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-outline-variant bg-surface-bright px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-[0_-4px_16px_rgba(15,23,42,0.03)] lg:px-6">{footer}</div>}
      </DialogContent>
    </Dialog>
  );
}
