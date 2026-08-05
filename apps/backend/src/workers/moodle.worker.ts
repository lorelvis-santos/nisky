import cron from "node-cron";
import { moodleService } from "../modules/moodle/moodle.service";

let processing = false;

export async function processMoodleSync() {
  if (processing) return;
  processing = true;
  try {
    const results = await moodleService.syncAll();
    const errors = Object.entries(results).filter(([, v]) => typeof v === "string");
    if (errors.length > 0) {
      console.error(`[moodle] ${errors.length} cuentas con error:`, errors.map(([id, msg]) => `${id}: ${msg}`).join(" | "));
    }
  } catch (error) {
    console.error("[moodle] Error en sync global", error);
  } finally {
    processing = false;
  }
}

export function startMoodleWorker() {
  void processMoodleSync();
  return cron.schedule("0 */3 * * *", () => void processMoodleSync());
}
