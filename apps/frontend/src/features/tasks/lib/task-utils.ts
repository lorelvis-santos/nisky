import { isLegacyNoonDate } from "@/lib/utils";

export function formatTaskDueDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const dateLabel = new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    weekday: "short",
  })
    .format(date)
    .replace(/[.,]/g, "");
  const label = `${dateLabel.charAt(0).toUpperCase()}${dateLabel.slice(1)}`;
  const isEndOfDay = (date.getHours() === 23 && date.getMinutes() === 59) || isLegacyNoonDate(value);
  if (isEndOfDay) return label;

  const time = date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
  });
  return `${label} · ${time}`;
}

export function formatDueTime(dueDate: string | null): string {
  if (!dueDate) return "";
  const date = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(date);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  const time = date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const shortDate = date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
  });

  if (diffDays === 0) return `Hoy ${time}`;
  if (diffDays === 1) return `Mañana ${time}`;
  if (diffDays < 0) return `Vencido ${shortDate}`;
  return shortDate;
}
