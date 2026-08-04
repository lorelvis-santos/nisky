import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function calendarDate(value: string | Date) {
  if (typeof value === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
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

export function isTaskOverdue(task: { dueDate: string | null; status: string }) {
  if (!task.dueDate || task.status === "COMPLETED" || task.status === "CANCELLED") return false;
  const dueDate = calendarDate(task.dueDate);
  const today = calendarDate(new Date());
  return dueDate.getTime() < today.getTime();
}
