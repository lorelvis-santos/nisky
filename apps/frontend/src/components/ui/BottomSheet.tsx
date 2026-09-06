"use client";

import { ChevronDown, X } from "lucide-react";
import { useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export function BottomSheet({
  open,
  onClose,
  children,
  title,
  description = "Panel de captura rápida",
  collapsible = false,
  defaultCollapsed = false,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (!open) return null;
  return (
    <Drawer fixed open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }} repositionInputs>
      <DrawerContent className="flex min-h-0 max-h-[85dvh] overflow-hidden rounded-t-lg border-outline-variant bg-surface pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-xl">
        <DrawerHeader className="flex shrink-0 flex-row items-center justify-between border-b border-outline-variant bg-surface/95 px-5 py-3 text-left backdrop-blur-md">
          <div>
            <DrawerTitle className="font-headline-xs text-headline-xs font-bold normal-case tracking-normal text-primary">
              {title ?? "Panel"}
            </DrawerTitle>
            <DrawerDescription className="sr-only">{description}</DrawerDescription>
          </div>
          <div className="flex items-center gap-1">
            {collapsible && (
              <button
                aria-label={collapsed ? "Expandir panel" : "Colapsar panel"}
                className="flex h-10 w-10 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                onClick={() => setCollapsed((value) => !value)}
                type="button"
              >
                <ChevronDown size={18} className={collapsed ? "transition-transform" : "rotate-180 transition-transform"} />
              </button>
            )}
            <DrawerClose asChild>
              <button aria-label="Cerrar" className="flex h-10 w-10 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface" type="button">
                <X size={18} />
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>
        {!collapsed && <div className="min-h-0 flex-1 overflow-y-auto" data-modal-scroll>{children}</div>}
      </DrawerContent>
    </Drawer>
  );
}
