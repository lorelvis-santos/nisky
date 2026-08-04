import { es } from "chrono-node";

export interface DetectedDate {
  date: Date;
  isoDate: string;
  matchedText: string;
  label: string;
}

const explicitDatePattern = /\b(?:hoy|mañana|pasado mañana|ayer|lunes|martes|miércoles|jueves|viernes|sábado|domingo|(?:el|día)\s+\d{1,2}|\d{1,2}\s*(?:\/|-| de )\s*(?:\d{1,2}|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)|\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre))\b/i;

export function detectDate(text: string): DetectedDate | null {
  const result = es.parse(text, new Date(), { forwardDate: true })[0];
  if (!result || !explicitDatePattern.test(result.text)) return null;
  const date = result.start.date();
  const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const label = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(date);
  return { date, isoDate, matchedText: result.text, label };
}
