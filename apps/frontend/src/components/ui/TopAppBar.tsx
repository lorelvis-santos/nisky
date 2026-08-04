"use client";

import { Bell, History, Menu, UserCircle } from "lucide-react";
import { usePathname } from "next/navigation";

const titles: Record<string, string> = {
  "/": "Panel de operaciones",
  "/tasks": "Planificación y tareas",
  "/focus": "Modo enfoque",
  "/journal": "Diario y reflexión",
  "/knowledge": "Base de conocimiento",
  "/settings": "Ajustes",
  "/support": "Soporte",
};

export function TopAppBar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const title = titles[pathname] ?? "Nisky";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-outline-variant bg-surface px-container-padding">
      <div className="flex items-center gap-element-gap-md md:hidden">
        <button aria-label="Abrir menú" className="text-on-surface-variant hover:text-primary" onClick={onMenu} type="button"><Menu size={20} /></button>
        <span className="font-headline-sm text-headline-sm font-bold text-primary">Nisky</span>
      </div>
      <div className="hidden flex-1 md:block" />
      <h2 className="absolute left-1/2 hidden -translate-x-1/2 font-headline-sm text-headline-sm font-bold text-on-surface lg:block">{title}</h2>
      <div className="ml-auto flex items-center gap-element-gap-sm">
        <button aria-label="Notificaciones" className="p-2 text-on-surface-variant hover:bg-surface-container-low hover:text-primary" type="button"><Bell size={19} /></button>
        <button aria-label="Historial" className="hidden p-2 text-on-surface-variant hover:bg-surface-container-low hover:text-primary sm:block" type="button"><History size={19} /></button>
        <button aria-label="Perfil" className="p-2 text-on-surface-variant hover:bg-surface-container-low hover:text-primary" type="button"><UserCircle size={20} /></button>
      </div>
    </header>
  );
}
