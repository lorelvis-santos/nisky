"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  MessageSquarePlus,
  X,
} from "lucide-react";
import { useState } from "react";
import { FeedbackModal } from "@/components/feedback/FeedbackModal";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthProvider";
import type { User } from "@/types/entities";
import { desktopPrimaryItems, desktopSecondaryItems, isNavigationItemActive, type NavigationItem } from "@/components/ui/navigation";

function NavItem({
  href,
  label,
  icon: Icon,
  onNavigate,
  collapsed,
  }: {
  href: NavigationItem["href"];
  label: NavigationItem["label"];
  icon: NavigationItem["icon"];
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const active = isNavigationItemActive(pathname, href);

  return (
    <Link
      className={`mx-3 flex items-center gap-element-gap-md rounded-xl px-3.5 py-2.5 font-body-md text-body-md transition-colors ${active ? "bg-secondary-fixed text-secondary shadow-sm font-semibold" : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"} ${collapsed ? "lg:mx-2 lg:w-12 lg:justify-center lg:gap-0 lg:px-0" : ""}`}
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
    >
      <Icon size={20} strokeWidth={1.8} />
      <span className={collapsed ? "lg:hidden" : undefined}>{label}</span>
    </Link>
  );
}

export function Sidebar({
  user,
  open,
  onClose,
  collapsed = false,
  onToggleCollapse,
}: {
  user: User | null;
  open: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const { logout } = useAuth();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      {open && (
        <button
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 hidden bg-on-surface/20 sm:block lg:hidden"
          onClick={onClose}
          type="button"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 hidden w-64 shrink-0 flex-col border-r border-outline-variant bg-surface-container-lowest transition-all duration-200 sm:flex lg:relative lg:z-auto lg:translate-x-0 ${collapsed ? "lg:w-16" : "lg:w-64"} ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className={`flex h-16 items-center justify-between border-b border-outline-variant px-6 ${collapsed ? "lg:justify-center lg:px-0" : ""}`}>
          <Link
            className="font-headline-lg text-headline-lg font-bold tracking-tight text-primary hover:underline"
            href="/"
            title="Nisky"
          >
            {collapsed ? (
              <>
                <span className="sm:hidden lg:inline">Nisky</span>
                <span className="hidden lg:inline">N</span>
              </>
            ) : (
              "Nisky"
            )}
          </Link>
          <button
            aria-label="Cerrar menú"
             className="text-on-surface-variant lg:hidden"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>
        <div
          className={`mx-4 mb-1 flex items-center gap-element-gap-md rounded-xl border border-outline-variant/70 bg-surface-container-low p-2.5 ${collapsed ? "lg:mx-2 lg:justify-center lg:border-transparent lg:bg-transparent lg:p-0" : ""}`}
        >
          <Avatar avatarUrl={user?.avatarUrl} className="h-9 w-9" email={user?.email} name={user?.name} size="md" />
          <div className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
            <p className="truncate font-body-md text-body-md font-semibold">
              {user?.name ?? "Usuario"}
            </p>
            <p className="truncate font-data-mono text-data-mono text-on-surface-variant">
              {user?.email}
            </p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto py-4">
          {desktopPrimaryItems.map((item) => (
            <NavItem {...item} collapsed={collapsed} key={item.href} onNavigate={onClose} />
          ))}
        </nav>
        <div className="border-t border-outline-variant py-3">
          <button
             className={`mx-3 flex w-[calc(100%-1.5rem)] items-center gap-element-gap-md rounded-lg px-3 py-2 text-left font-label-md text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface ${collapsed ? "lg:mx-2 lg:w-12 lg:justify-center lg:gap-0 lg:px-0" : ""}`}
            onClick={() => {
              onClose();
              setFeedbackOpen(true);
            }}
            title={collapsed ? "Feedback" : undefined}
            type="button"
          >
            <MessageSquarePlus size={17} strokeWidth={1.8} />
             <span className={collapsed ? "lg:hidden" : undefined}>Feedback</span>
          </button>
          {desktopSecondaryItems.map((item) => (
            <NavItem {...item} collapsed={collapsed} key={item.href} onNavigate={onClose} />
          ))}
        </div>
        <div className="border-t border-outline-variant px-6 py-4">
          <button
             className={`flex w-full items-center gap-element-gap-sm text-on-surface-variant hover:text-error ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
            onClick={() => void logout()}
            title={collapsed ? "Cerrar sesión" : undefined}
            type="button"
          >
            <LogOut size={18} />
             <span className={`font-body-sm text-body-sm ${collapsed ? "lg:hidden" : ""}`}>Cerrar sesión</span>
          </button>
        </div>
         <div className={`border-t border-outline-variant py-4 pl-0 pr-6 ${collapsed ? "lg:hidden" : ""}`}>
          <Image
            alt="Las"
            className="h-10 w-full object-contain"
            height={40}
            src="/las-logo-2.png"
            width={1264}
          />
        </div>
        <button
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
           className="absolute -right-3 top-5 z-50 hidden h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-on-surface-variant shadow-sm transition-colors hover:border-primary hover:bg-surface-container-low hover:text-primary lg:flex"
          onClick={onToggleCollapse}
          title={collapsed ? "Expandir menú (Alt+B)" : "Colapsar menú (Alt+B)"}
          type="button"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>
      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </>
  );
}
