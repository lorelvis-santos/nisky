import { moodleEvents as moodleEventsWithCurlCffi, moodleToken as moodleTokenWithCurlCffi } from "./moodle.python";
import type { MoodleResult } from "./moodle.types";

async function withCurlCffiFallback<T>(operation: string, primary: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    const reason = error instanceof Error ? error.name : "error desconocido";
    console.error(`[moodle:${operation}] wreq-js falló (${reason}); usando curl_cffi como fallback`);
    return fallback();
  }
}

export function moodleToken(domain: string, username: string, password: string, service = "moodle_mobile_app"): Promise<MoodleResult> {
  return withCurlCffiFallback(
    "token",
    async () => {
      const client = await import("./moodle.wreq");
      return client.moodleTokenWithWreq(domain, username, password, service);
    },
    () => moodleTokenWithCurlCffi(domain, username, password, service),
  );
}

export function moodleEvents(domain: string, token: string, daysPast = 14, daysAhead = 365): Promise<MoodleResult> {
  return withCurlCffiFallback(
    "events",
    async () => {
      const client = await import("./moodle.wreq");
      return client.moodleEventsWithWreq(domain, token, daysPast, daysAhead);
    },
    () => moodleEventsWithCurlCffi(domain, token, daysPast, daysAhead),
  );
}
