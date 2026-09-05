import type { LucideIcon } from "lucide-react";
import {
  AlarmClock,
  BookOpen,
  CalendarClock,
  CalendarDays,
  FolderKanban,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  ListTodo,
  PencilLine,
  Settings,
  Timer,
} from "lucide-react";

export type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navigation = {
  home: { href: "/", label: "Inicio", icon: LayoutDashboard },
  projects: { href: "/projects", label: "Proyectos", icon: FolderKanban },
  tasks: { href: "/tasks", label: "Planificación y tareas", icon: ListTodo },
  events: { href: "/events", label: "Eventos", icon: CalendarDays },
  timeblocks: { href: "/timeblocks", label: "Agenda", icon: CalendarClock },
  focus: { href: "/focus", label: "Modo enfoque", icon: Timer },
  journal: { href: "/journal", label: "Diario", icon: PencilLine },
  knowledge: { href: "/knowledge", label: "Mis notas", icon: BookOpen },
  quickNotes: { href: "/quick-notes", label: "Capturas rápidas", icon: Inbox },
  reminders: { href: "/reminders", label: "Recordatorios", icon: AlarmClock },
  settings: { href: "/settings", label: "Ajustes", icon: Settings },
  support: { href: "/support", label: "Ayuda", icon: HelpCircle },
} satisfies Record<string, NavigationItem>;

export const desktopPrimaryItems = [
  navigation.home,
  navigation.projects,
  navigation.tasks,
  navigation.timeblocks,
  navigation.focus,
  navigation.journal,
  navigation.knowledge,
  navigation.reminders,
] satisfies NavigationItem[];

export const desktopSecondaryItems = [navigation.settings, navigation.support] satisfies NavigationItem[];

export const mobilePrimaryItems = [
  { ...navigation.home, label: "Hoy" },
  { ...navigation.tasks, label: "Plan" },
  { ...navigation.focus, label: "Enfoque" },
  { ...navigation.knowledge, label: "Notas" },
] satisfies NavigationItem[];

export const mobileMoreItems = [
  navigation.projects,
  navigation.quickNotes,
  navigation.timeblocks,
  navigation.journal,
  navigation.reminders,
] satisfies NavigationItem[];

export const mobileMoreAccountItems = [navigation.settings, navigation.support] satisfies NavigationItem[];

export function isNavigationItemActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
