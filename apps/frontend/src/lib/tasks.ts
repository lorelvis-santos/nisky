import { localDateKey } from "@/lib/utils";

export function dateKey(date: Date | string) {
  if (typeof date === "string") return localDateKey(date);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
