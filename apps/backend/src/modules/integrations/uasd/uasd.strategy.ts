import { DateTime } from "luxon";
import { createUasdTransport } from "../../../../scripts/uasd/transport";
import { scrapeUasd } from "../../../../scripts/uasd/scraper";
import { UASD_TIME_ZONE, UasdError } from "../../../../scripts/uasd/types";
import type { UasdRemoteItem, UasdScrapeSuccess } from "../../../../scripts/uasd/types";
import type { UasdHttpClient } from "../../../../scripts/uasd/transport";
import { uasdCoordinator } from "./uasd.coordinator";

export const UASD_ACCOUNT_DOMAIN = "https://app.uasd.edu.do";

export interface UasdCredentials {
  userId: string;
  accountId: string;
  username: string;
  password: string;
  period: string;
}

export interface UasdFetchWindow {
  daysPast: number;
  daysAhead: number;
}

export class UasdIntegrationError extends Error {
  readonly retryable: boolean;
  readonly code: string;

  constructor(code: string, message: string, retryable: boolean) {
    super(message);
    this.name = "UasdIntegrationError";
    this.code = code;
    this.retryable = retryable;
  }
}

export class UasdStrategy {
  async fetchItems(credentials: UasdCredentials, workerId: string, window: UasdFetchWindow): Promise<UasdScrapeSuccess> {
    const client = await createUasdTransport();
    try {
      return await uasdCoordinator.withJobLimits(
        credentials.userId,
        credentials.accountId,
        workerId,
        client,
        async (coordinatedClient) => this.scrape(credentials, coordinatedClient, window),
      );
    } finally {
      await client.close().catch(() => undefined);
    }
  }

  private async scrape(credentials: UasdCredentials, client: UasdHttpClient, window: UasdFetchWindow): Promise<UasdScrapeSuccess> {
    const now = DateTime.now().setZone(UASD_TIME_ZONE);
    const from = now.minus({ days: window.daysPast }).toISODate();
    const to = now.plus({ days: window.daysAhead }).toISODate();
    if (!from || !to) throw new UasdIntegrationError("INVALID_WINDOW", "La ventana de sincronización UASD no es válida", false);

    const result = await scrapeUasd(
      {
        username: credentials.username,
        password: credentials.password,
        period: credentials.period,
        from,
        to,
      },
      { client },
    );
    if (!result.ok) {
      throw new UasdIntegrationError(result.error.code, result.error.message, result.error.retryable);
    }
    return result;
  }
}

export function errorDetails(error: unknown): { message: string; retryable: boolean } {
  if (error instanceof UasdIntegrationError) return { message: error.message, retryable: error.retryable };
  if (error instanceof UasdError) return { message: error.message, retryable: error.retryable };
  if (error instanceof Error) return { message: error.message, retryable: true };
  return { message: "Error desconocido durante la sincronización UASD", retryable: true };
}

export type { UasdRemoteItem };

export const uasdStrategy = new UasdStrategy();
