"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  AlarmClock,
  BookOpen,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  HelpCircle,
  LayoutDashboard,
  ListTodo,
  LogOut,
  MessageSquarePlus,
  PencilLine,
  Settings,
  Timer,
  X,
} from "lucide-react";
import { useState } from "react";
import { FeedbackModal } from "@/components/feedback/FeedbackModal";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthProvider";
import type { User } from "@/types/entities";

const primaryItems = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/projects", label: "Proyectos", icon: FolderKanban },
  { href: "/tasks", label: "Planificación y tareas", icon: ListTodo },
  { href: "/events", label: "Eventos", icon: CalendarDays },
  { href: "/timeblocks", label: "Agenda", icon: CalendarClock },
  { href: "/focus", label: "Modo enfoque", icon: Timer },
  { href: "/journal", label: "Diario", icon: PencilLine },
  { href: "/knowledge", label: "Mis notas", icon: BookOpen },
  { href: "/reminders", label: "Recordatorios", icon: AlarmClock },
];

const secondaryItems = [
  { href: "/settings", label: "Ajustes", icon: Settings },
  { href: "/support", label: "Ayuda", icon: HelpCircle },
];

function NavItem({
  href,
  label,
  icon: Icon,
  onNavigate,
  collapsed,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const active =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      className={`flex items-center gap-element-gap-md border-l-2 px-container-padding py-3 font-body-md text-body-md transition-colors ${active ? "border-primary bg-secondary-container text-on-secondary-container font-semibold" : "border-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"} ${collapsed ? "md:justify-center md:px-0" : ""}`}
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
    >
      <Icon size={20} strokeWidth={1.8} />
      <span className={collapsed ? "md:hidden" : undefined}>{label}</span>
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
          className="fixed inset-0 z-40 bg-on-surface/20 md:hidden"
          onClick={onClose}
          type="button"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-outline-variant bg-surface transition-all duration-200 md:relative md:z-auto md:translate-x-0 ${collapsed ? "md:w-16" : "md:w-64"} ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-14 items-center justify-between border-b border-outline-variant px-container-padding">
          <Link
            className="font-headline-sm text-headline-sm font-bold text-primary hover:underline"
            href="/"
            title="Nisky"
          >
            {collapsed ? (
              <>
                <span className="md:hidden">Nisky</span>
                <span className="hidden md:inline">N</span>
              </>
            ) : (
              "Nisky"
            )}
          </Link>
          <button
            aria-label="Cerrar menú"
            className="text-on-surface-variant md:hidden"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>
        <div
          className={`flex items-center gap-element-gap-md border-b border-outline-variant px-container-padding py-3 ${collapsed ? "md:justify-center md:px-0" : ""}`}
        >
          <Avatar avatarUrl={user?.avatarUrl} email={user?.email} name={user?.name} size="md" />
          <div className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
            <p className="truncate font-body-md text-body-md font-semibold">
              {user?.name ?? "Usuario"}
            </p>
            <p className="truncate font-data-mono text-data-mono text-on-surface-variant">
              {user?.email}
            </p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-element-gap-xs overflow-y-auto py-element-gap-md">
          {primaryItems.map((item) => (
            <NavItem {...item} collapsed={collapsed} key={item.href} onNavigate={onClose} />
          ))}
        </nav>
        <div className="border-t border-outline-variant py-element-gap-xs">
          <button
            className={`flex w-full items-center gap-element-gap-md border-l-2 border-transparent px-container-padding py-3 text-left font-body-md text-body-md text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface ${collapsed ? "md:justify-center md:px-0" : ""}`}
            onClick={() => {
              onClose();
              setFeedbackOpen(true);
            }}
            title={collapsed ? "Feedback" : undefined}
            type="button"
          >
            <MessageSquarePlus size={20} strokeWidth={1.8} />
            <span className={collapsed ? "md:hidden" : undefined}>Feedback</span>
          </button>
          {secondaryItems.map((item) => (
            <NavItem {...item} collapsed={collapsed} key={item.href} onNavigate={onClose} />
          ))}
        </div>
        <div className="border-t border-outline-variant p-container-padding">
          <button
            className={`flex w-full items-center gap-element-gap-sm text-on-surface-variant hover:text-error ${collapsed ? "md:justify-center md:px-0" : ""}`}
            onClick={() => void logout()}
            title={collapsed ? "Cerrar sesión" : undefined}
            type="button"
          >
            <LogOut size={18} />
            <span className={`font-body-sm text-body-sm ${collapsed ? "md:hidden" : ""}`}>Cerrar sesión</span>
          </button>
        </div>
<div className={`border-t border-outline-variant py-4 pl-0 pr-container-padding ${collapsed ? "md:hidden" : ""}`}>
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
          className="absolute -right-3 top-4 z-50 hidden h-6 w-6 cursor-pointer items-center justify-center border border-outline-variant bg-surface text-on-surface-variant transition-colors hover:border-primary hover:bg-surface-container-low hover:text-primary md:flex"
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