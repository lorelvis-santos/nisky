"use client";

import { ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";

export function BottomSheet({
  open,
  onClose,
  children,
  title,
  collapsible = false,
  defaultCollapsed = false,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const showCollapse = collapsible && !collapsed;

  if (!open) return null;
  return <SheetBody collapsed={collapsed} onClose={onClose} onToggleCollapse={() => setCollapsed((value) => !value)} showCollapse={showCollapse} title={title}>{children}</SheetBody>;
}

function SheetBody({
  collapsed,
  onClose,
  onToggleCollapse,
  showCollapse,
  title,
  children,
}: {
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  showCollapse: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  useModalScrollLock();
  return (
    <div aria-modal="true" className="fixed inset-0 z-50 flex flex-col justify-end bg-on-surface/20 backdrop-blur-[1px]" onClick={onClose} role="dialog">
      <div
        aria-hidden="true"
        className={`mx-auto mb-3 h-1.5 w-10 rounded-full bg-outline-variant transition-transform duration-300 ${collapsed ? "translate-y-0" : ""}`}
        onClick={(event) => event.stopPropagation()}
      />
      <div
        className="flex max-h-[85vh] w-full flex-col border-t border-outline-variant bg-surface transition-transform duration-300 ease-out"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-bright px-5 py-3">
          <h2 className="font-headline-xs text-headline-xs font-bold text-primary">{title ?? ""}</h2>
          <div className="flex items-center gap-1">
            {showCollapse && (
              <button aria-label="Colapsar panel" className="p-1.5 text-on-surface-variant hover:text-on-surface" onClick={onToggleCollapse} type="button">
                <ChevronDown size={18} className="rotate-180 transition-transform" />
              </button>
            )}
            <button aria-label="Cerrar" className="p-1.5 text-on-surface-variant hover:text-on-surface" onClick={onClose} type="button">
              <X size={18} />
            </button>
          </div>
        </div>
        {!collapsed && <div className="overflow-y-auto" data-modal-scroll>{children}</div>}
      </div>
    </div>
  );
}
