import cron from "node-cron";
import { integrationService } from "../modules/integrations/integration.service";

let processing = false;

export async function processIntegrationSync() {
  if (processing) return;
  processing = true;
  try {
    const errors: string[] = [];
    for (const provider of ["MOODLE", "CANVAS"] as const) {
      const results = await integrationService.syncAll(provider);
      const providerErrors = Object.entries(results).filter(([, value]) => typeof value === "string");
      if (providerErrors.length > 0) {
        errors.push(`[${provider}] ${providerErrors.length} cuentas con error: ${providerErrors.map(([id, msg]) => `${id}: ${msg}`).join(" | ")}`);
      }
    }
    if (errors.length > 0) console.error(`[integrations] ${errors.join(" · ")}`);
  } catch (error) {
    console.error("[integrations] Error en sync global", error);
  } finally {
    processing = false;
  }
}

export function startIntegrationsWorker() {
  void processIntegrationSync();
  return cron.schedule("0 */3 * * *", () => void processIntegrationSync());
}