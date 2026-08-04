import { es } from "chrono-node";

export interface DetectedDate {
  date: Date;
  isoDate: string;
  matchedText: string;
  label: string;
}

export function detectDate(text: string): DetectedDate | null {
  const result = es.parse(text, new Date(), { forwardDate: true })[0];
  if (!result) return null;
  const date = result.start.date();
  const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const label = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(date);
  return { date, isoDate, matchedText: result.text, label };
}
