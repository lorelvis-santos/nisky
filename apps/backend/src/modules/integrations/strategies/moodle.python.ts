import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import type { MoodleResult } from "./moodle.types";

const PROJECT_ROOT = process.cwd();
const SCRIPT_PATH = process.env.MOODLE_PYTHON_SCRIPT ?? path.join(PROJECT_ROOT, "scripts", "moodle_fetch.py");
const LOCAL_VENV = path.join(PROJECT_ROOT, "scripts", ".venv", "bin", "python");
const PYTHON_BIN = process.env.MOODLE_PYTHON_BIN
  ?? (existsSync(LOCAL_VENV) ? LOCAL_VENV : "python3");

type PythonResult = MoodleResult;

export function runMoodleScript(args: string[]): PythonResult {
  const operation = args[0] ?? "unknown";
  const result = spawnSync(PYTHON_BIN, [SCRIPT_PATH, ...args], {
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error) {
    const error = `No se pudo ejecutar el cliente Moodle: ${result.error.message}`;
    console.error(`[moodle:${operation}] ${error}`);
    return { ok: false, error };
  }
  const stderr = result.stderr?.trim();
  if (stderr) console.error(`[moodle:${operation}] ${stderr}`);
  const raw = result.stdout?.trim();
  if (!raw) {
    const error = `El cliente Moodle no devolvió salida (stderr: ${stderr?.split("\n").filter((l) => l.trim()).slice(-5).join(" · ") ?? ""})`;
    console.error(`[moodle:${operation}] ${error}`);
    return { ok: false, error };
  }
  try {
    const parsed = JSON.parse(raw) as PythonResult;
    if (!parsed.ok) console.error(`[moodle:${operation}] ${parsed.error}`);
    return parsed;
  } catch {
    const error = `El cliente Moodle devolvió algo inesperado: ${raw.slice(0, 200)}`;
    console.error(`[moodle:${operation}] ${error}`);
    return { ok: false, error };
  }
}

export function moodleToken(domain: string, username: string, password: string, service = "moodle_mobile_app"): MoodleResult {
  return runMoodleScript(["token", "--url", domain, "--username", username, "--password", password, "--service", service]);
}

export function moodleEvents(domain: string, token: string, daysPast = 14, daysAhead = 365): MoodleResult {
  return runMoodleScript(["events", "--url", domain, "--token", token, "--days-past", String(daysPast), "--days-ahead", String(daysAhead)]);
}
