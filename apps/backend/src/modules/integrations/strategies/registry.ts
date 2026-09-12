import type { IntegrationStrategy, StandardIntegrationProvider } from "./types";
import { canvasStrategy } from "./canvas.strategy";
import { moodleStrategy } from "./moodle.strategy";

export const STRATEGIES: Record<StandardIntegrationProvider, IntegrationStrategy> = {
  MOODLE: moodleStrategy,
  CANVAS: canvasStrategy,
};

export function getStrategy(providerValue: string): IntegrationStrategy {
  const strategy = STRATEGIES[providerValue as StandardIntegrationProvider];
  if (!strategy) throw new Error(`Proveedor desconocido: ${providerValue}`);
  return strategy;
}
