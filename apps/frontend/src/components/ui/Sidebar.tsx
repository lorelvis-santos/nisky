"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import type { User } from "@/types/entities";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function Sidebar({ user }: { user: User | null }) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-outline-variant bg-surface-container-low md:flex">
      <div className="flex items-center gap-element-gap-sm border-b border-outline-variant p-container-padding">
        <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-primary-foreground font-semibold">N</div>
        <div>
          <h1 className="font-headline-xs text-headline-xs font-semibold text-primary">Nisky</h1>
          <p className="font-data-mono text-data-mono text-[10px] text-on-surface-variant">v0.1.0</p>
        </div>
      </div>
      <nav className="flex-1 space-y-element-gap-xs py-element-gap-md">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              className={`flex items-center gap-element-gap-md border-l-2 px-container-padding py-2 font-body-md text-body-md transition-colors ${active ? "border-primary bg-surface-container-high text-primary font-semibold" : "border-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface"}`}
              href={item.href}
              key={item.href}
            >
              <Icon size={18} strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-outline-variant p-container-padding">
        <div className="mb-element-gap-md truncate">
          <p className="font-body-sm text-body-sm font-medium text-on-surface">{user?.name ?? "Usuario"}</p>
          <p className="font-data-mono text-data-mono text-[11px] text-on-surface-variant">{user?.email}</p>
        </div>
        <button className="flex w-full items-center gap-element-gap-sm text-on-surface-variant hover:text-error" onClick={() => void logout()} type="button">
          <LogOut size={16} />
          <span className="font-body-sm text-body-sm">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
