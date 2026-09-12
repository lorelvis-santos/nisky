import { scrapeUasd } from "./uasd/scraper";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "scrape" || args[1] !== "--stdin") {
    process.stderr.write("Uso: bun scripts/uasd_fetch.ts scrape --stdin\n");
    process.exitCode = 2;
    return;
  }

  let input: unknown;
  try {
    input = JSON.parse(await Bun.stdin.text());
  } catch {
    process.stdout.write(`${JSON.stringify({
      ok: false,
      error: { code: "INVALID_INPUT", message: "La entrada stdin no es JSON valido", retryable: false },
    })}\n`);
    process.exitCode = 2;
    return;
  }

  const result = await scrapeUasd(input);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (!result.ok) process.exitCode = result.error.retryable ? 75 : 1;
}

if (import.meta.main) {
  await main();
}
