# UASD scraper spike

Standalone scraper for the UASD gateway and Moodle sites. UASD is integrated as
its own provider and is processed by a separate durable queue worker.

## Local verification

```bash
cd apps/backend
bun test scripts/uasd/uasd.test.ts
bun run typecheck
```

The tests use anonymized fixtures and replay the complete flow at 1, 20, 50,
and 100 concurrent runs. They do not make network requests.

## CLI

The CLI reads one JSON object from stdin:

```json
{
  "username": "ID_BANNER",
  "password": "PASSWORD",
  "captcha": "OPTIONAL_CAPTCHA",
  "period": "202610",
  "from": "2026-09-01",
  "to": "2026-09-30"
}
```

Run it with:

```bash
bun scripts/uasd_fetch.ts scrape --stdin
```

The result is one JSON object on stdout. Request-level logs are disabled by
default; set `UASD_VERBOSE_LOGS=true` to print method, redacted path, status,
and redirect information on stderr. The scraper never
solves or bypasses CAPTCHA or challenge pages; those responses are returned as
an error.

Optional environment variables:

- `UASD_WREQ_BROWSER` defaults to `chrome_149`.
- `UASD_PROXY_URL` configures an explicit proxy.
- `UASD_TIMEOUT_MS` defaults to `40000`.

## Nisky integration worker

The initial connection scrapes UASD in the HTTP request so the user receives a
definitive result. Later manual and scheduled synchronizations are durable
queue jobs. Run one or more dedicated worker processes:

```bash
cd apps/backend
bun run worker:uasd
```

Jobs are claimed with PostgreSQL `SKIP LOCKED`. Redis provides distributed
account, user, global, and host limits so multiple worker processes cannot run
the same account concurrently. The initial limits are conservative and can be
changed with `UASD_*` environment variables. The worker prints one summary per
job; individual requests are opt-in with `UASD_VERBOSE_LOGS=true`.
