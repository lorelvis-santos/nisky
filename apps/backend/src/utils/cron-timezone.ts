import { parseExpression } from "cron-parser";
import { DateTime } from "luxon";

export interface ScheduledJob {
  stop: () => void;
}

export function scheduleInTimezone(cronExpr: string, fn: () => void, zone: string = "America/Santo_Domingo"): ScheduledJob {
  let stopped = false;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const tick = async () => {
    if (stopped) return;
    try {
      const now = DateTime.now().setZone(zone);
      const interval = parseExpression(cronExpr, {
        tz: zone,
        currentDate: now.toISO() ?? undefined,
      });
      const next = interval.next().toDate();
      const ms = next.getTime() - Date.now();
      timeout = setTimeout(() => {
        if (!stopped) {
          fn();
          void tick();
        }
      }, Math.max(0, ms));
    } catch (error) {
      console.error(`[cron] Failed to schedule "${cronExpr}" in ${zone}:`, error);
    }
  };

  void tick();

  return {
    stop: () => {
      stopped = true;
      if (timeout) clearTimeout(timeout);
    },
  };
}