import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function calendarDate(value: string | Date) {
  if (typeof value === "string") {
    // Date-only values ("YYYY-MM-DD) represent a local calendar day, not UTC.
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Devuelve el día calendario en hora local (YYYY-MM-DD) de un valor ISO (UTC),
 * de modo que una fecha como "2026-08-06T03:59:00.000Z" cuente como el 5 de
 * agosto en una zona horaria UTC-4.
 */
export function localDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatRelativeDate(value: string | Date, lowercase = false, reference = new Date()) {
  const target = calendarDate(value);
  const today = calendarDate(reference);
  const targetDay = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const todayDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const difference = Math.round((targetDay - todayDay) / 86_400_000);

  let label: string;
  if (difference === -2) label = "Antes de ayer";
  else if (difference === -1) label = "Ayer";
  else if (difference === 0) label = "Hoy";
  else if (difference === 1) label = "Mañana";
  else if (difference === 2) label = "Pasado mañana";
  else label = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(target);

  return lowercase ? label.toLowerCase() : label;
}

export function formatCreatedAt(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatShortDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function isTaskOverdue(task: { dueDate: string | null; status: string }) {
  if (!task.dueDate || task.status === "COMPLETED" || task.status === "CANCELLED") return false;
  const dueDate = calendarDate(task.dueDate);
  const today = calendarDate(new Date());
  return dueDate.getTime() < today.getTime();
}
