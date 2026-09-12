import { randomUUID } from "node:crypto";
import { redis } from "../../../infra/redis/client";
import { UasdError } from "../../../../scripts/uasd/types";
import { validateUasdUrl, type UasdHttpClient, type UasdHttpRequest, type UasdHttpResponse } from "../../../../scripts/uasd/transport";

const DEFAULT_GLOBAL_CONCURRENCY = 2;
const DEFAULT_USER_CONCURRENCY = 1;
const DEFAULT_HOST_CONCURRENCY = 1;
const DEFAULT_LEASE_MS = 120_000;
const DEFAULT_WAIT_MS = 30_000;
const DEFAULT_REQUEST_INTERVAL_MS = 500;
const ACQUIRE_SCRIPT = `
  local redisTime = redis.call('TIME')
  local now = tonumber(redisTime[1]) * 1000 + math.floor(tonumber(redisTime[2]) / 1000)
  redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now)
  if redis.call('ZCARD', KEYS[1]) >= tonumber(ARGV[2]) then return 0 end
  redis.call('ZADD', KEYS[1], now + tonumber(ARGV[3]), ARGV[1])
  redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[3]))
  return 1
`;
const RENEW_SCRIPT = `
  local redisTime = redis.call('TIME')
  local now = tonumber(redisTime[1]) * 1000 + math.floor(tonumber(redisTime[2]) / 1000)
  local score = redis.call('ZSCORE', KEYS[1], ARGV[1])
  if score == false or tonumber(score) <= now then
    redis.call('ZREM', KEYS[1], ARGV[1])
    return 0
  end
  redis.call('ZADD', KEYS[1], now + tonumber(ARGV[2]), ARGV[1])
  redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[2]))
  return 1
`;
const RELEASE_SCRIPT = `
  redis.call('ZREM', KEYS[1], ARGV[1])
  if redis.call('ZCARD', KEYS[1]) == 0 then redis.call('DEL', KEYS[1]) end
  return 1
`;
const RESERVE_SCRIPT = `
  local redisTime = redis.call('TIME')
  local now = tonumber(redisTime[1]) * 1000 + math.floor(tonumber(redisTime[2]) / 1000)
  local interval = tonumber(ARGV[1])
  local nextAt = tonumber(redis.call('GET', KEYS[1]) or '0')
  if nextAt < now then nextAt = now end
  redis.call('SET', KEYS[1], tostring(nextAt + interval), 'PX', interval + 60000)
  return nextAt
`;

interface Lease {
  renew: () => Promise<boolean>;
  release: () => Promise<void>;
}

export class UasdConcurrencyCoordinator {
  async withJobLimits<T>(
    userId: string,
    accountId: string,
    workerId: string,
    client: UasdHttpClient,
    operation: (client: UasdHttpClient) => Promise<T>,
  ): Promise<T> {
    const holder = `${workerId}:${accountId}:${randomUUID()}`;
    const leases: Lease[] = [];
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let leaseLost = false;
    const leaseMs = configuredLeaseMs();

    try {
      // Every worker acquires these scopes in the same order to avoid lock inversion.
      leases.push(await this.acquire(`uasd:account:${accountId}`, 1, `${holder}:account`));
      leases.push(await this.acquire(`uasd:user:${userId}`, configuredLimit("UASD_USER_CONCURRENCY", DEFAULT_USER_CONCURRENCY), `${holder}:user`));
      leases.push(await this.acquire("uasd:global", configuredLimit("UASD_GLOBAL_CONCURRENCY", DEFAULT_GLOBAL_CONCURRENCY), `${holder}:global`));

      const renewalInterval = heartbeatInterval(leaseMs);
      heartbeat = setInterval(() => {
        for (const lease of leases) {
          void lease.renew().then((renewed) => {
            if (!renewed) leaseLost = true;
          }).catch((error) => {
            leaseLost = true;
            console.error(`[uasd] no se pudo renovar un lease de coordinación: ${error instanceof Error ? error.message : String(error)}`);
          });
        }
      }, renewalInterval);

      const coordinatedClient: UasdHttpClient = {
        request: async (url, init) => {
          if (leaseLost) throw new UasdError("RATE_LIMITED", "Se perdió el lease de coordinación UASD", true);
          const response = await this.withHostLimit(client, url, init, holder);
          if (leaseLost) throw new UasdError("RATE_LIMITED", "Se perdió el lease de coordinación UASD", true);
          return response;
        },
        close: () => client.close(),
        get stats() {
          return client.stats;
        },
      };
      const result = await operation(coordinatedClient);
      if (leaseLost) throw new UasdError("RATE_LIMITED", "Se perdió el lease de coordinación UASD", true);
      return result;
    } finally {
      if (heartbeat) clearInterval(heartbeat);
      for (const lease of leases.reverse()) await lease.release().catch(() => undefined);
    }
  }

  private async withHostLimit(
    client: UasdHttpClient,
    url: string | URL,
    init: UasdHttpRequest | undefined,
    parentHolder: string,
  ): Promise<UasdHttpResponse> {
    const host = validateUasdUrl(url).hostname.toLowerCase();

    const lease = await this.acquire(
      `uasd:host:${host}`,
      configuredLimit("UASD_HOST_CONCURRENCY", DEFAULT_HOST_CONCURRENCY),
      `${parentHolder}:host:${host}:${randomUUID()}`,
    );
    const leaseMs = configuredLeaseMs();
    let leaseLost = false;
    const heartbeat = setInterval(() => {
      void lease.renew().then((renewed) => {
        if (!renewed) leaseLost = true;
      }).catch(() => {
        leaseLost = true;
      });
    }, heartbeatInterval(leaseMs));
    try {
      if (leaseLost) throw new UasdError("RATE_LIMITED", "Se perdió el lease del host UASD", true);
      const reservedAt = await this.reserveHost(host);
      const wait = reservedAt - Date.now();
      if (wait > 0) await sleep(wait);
      if (leaseLost) throw new UasdError("RATE_LIMITED", "Se perdió el lease del host UASD", true);
      const response = await client.request(url, init);
      if (leaseLost) throw new UasdError("RATE_LIMITED", "Se perdió el lease del host UASD", true);
      return response;
    } finally {
      clearInterval(heartbeat);
      await lease.release().catch(() => undefined);
    }
  }

  private async acquire(key: string, limit: number, holder: string): Promise<Lease> {
    const leaseMs = configuredLeaseMs();
    const deadline = Date.now() + configuredNumber("UASD_COORDINATION_WAIT_MS", DEFAULT_WAIT_MS);
    while (true) {
      const acquired = await redis.eval(ACQUIRE_SCRIPT, 1, key, holder, String(limit), String(leaseMs));
      if (Number(acquired) === 1) {
        let released = false;
        return {
          renew: async () => {
            if (released) return false;
            const renewed = await redis.eval(RENEW_SCRIPT, 1, key, holder, String(leaseMs));
            return Number(renewed) === 1;
          },
          release: async () => {
            if (released) return;
            released = true;
            await redis.eval(RELEASE_SCRIPT, 1, key, holder);
          },
        };
      }
      if (Date.now() >= deadline) {
        throw new UasdError("RATE_LIMITED", `La cola UASD no obtuvo cupo para ${key}`, true);
      }
      await sleep(Math.min(250, Math.max(25, deadline - Date.now())));
    }
  }

  private async reserveHost(host: string): Promise<number> {
    const interval = Math.max(1, Math.floor(configuredNumber("UASD_MIN_REQUEST_INTERVAL_MS", DEFAULT_REQUEST_INTERVAL_MS)));
    const result = await redis.eval(RESERVE_SCRIPT, 1, `uasd:host-next:${host}`, String(interval));
    return Number(result);
  }
}

function configuredLeaseMs(): number {
  return Math.max(1_000, Math.floor(configuredNumber("UASD_COORDINATION_LEASE_MS", DEFAULT_LEASE_MS)));
}

function heartbeatInterval(leaseMs: number): number {
  return Math.max(250, Math.min(10_000, Math.floor(leaseMs / 3)));
}

function configuredLimit(name: string, fallback: number): number {
  return Math.max(1, Math.floor(configuredNumber(name, fallback)));
}

function configuredNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const uasdCoordinator = new UasdConcurrencyCoordinator();
