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