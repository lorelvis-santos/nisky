export function habitDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00.000Z`) : new Date(value);
}

export function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function localDateKey(value = new Date()) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function addDays(value: string, amount: number) {
  const result = new Date(`${value}T12:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + amount);
  return dateKey(result);
}

/**
 * Cuenta días consecutivos completados terminando hoy (o ayer).
 * `entries` debe venir ordenado por fecha descendente.
 */
export function computeStreak(entries: Array<{ date: Date }>, today = localDateKey()) {
  if (entries.length === 0) return 0;
  const last = dateKey(entries[0]!.date);
  const daysSinceLast = Math.round((Date.parse(`${today}T12:00:00.000Z`) - Date.parse(`${last}T12:00:00.000Z`)) / 86_400_000);
  if (daysSinceLast > 1) return 0;
  let count = 1;
  let expected = last;
  for (const entry of entries.slice(1)) {
    expected = addDays(expected, -1);
    if (dateKey(entry.date) !== expected) break;
    count += 1;
  }
  return count;
}
