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

function weekdayOf(value: string) {
  return new Date(`${value}T12:00:00.000Z`).getUTCDay();
}

/**
 * Cuenta las sesiones programadas consecutivas cumplidas, terminando hoy.
 * Solo cuentan los días en `daysOfWeek` (0=Dom ... 6=Sáb); un día no
 * programado no rompe la racha. Hoy pendiente no la rompe todavía; el
 * primer día programado ya transcurrido sin completar sí.
 * `entries` debe venir ordenado por fecha descendente.
 */
export function computeStreak(
  entries: Array<{ date: Date }>,
  today = localDateKey(),
  daysOfWeek: number[] = [0, 1, 2, 3, 4, 5, 6],
) {
  const programmed = new Set(daysOfWeek);
  const done = new Set(entries.map((entry) => dateKey(entry.date)));
  let streak = 0;
  let cursor = today;
  for (let i = 0; i < 366; i++) {
    if (!programmed.has(weekdayOf(cursor))) {
      cursor = addDays(cursor, -1);
      continue;
    }
    if (done.has(cursor)) {
      streak += 1;
      cursor = addDays(cursor, -1);
      continue;
    }
    if (cursor === today) {
      cursor = addDays(cursor, -1);
      continue;
    }
    break;
  }
  return streak;
}
