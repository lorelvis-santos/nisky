import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const PROJECT_ROOT = process.cwd();
const SCRIPT_PATH = process.env.MOODLE_PYTHON_SCRIPT ?? path.join(PROJECT_ROOT, "scripts", "moodle_fetch.py");
const LOCAL_VENV = path.join(PROJECT_ROOT, "scripts", ".venv", "bin", "python");
const PYTHON_BIN = process.env.MOODLE_PYTHON_BIN
  ?? (existsSync(LOCAL_VENV) ? LOCAL_VENV : "python3");

type PythonResult = { ok: true; count?: number; token?: string; events?: Record<string, unknown>[] }
  | { ok: false; error: string };

export function runMoodleScript(args: string[]): PythonResult {
  const result = spawnSync(PYTHON_BIN, [SCRIPT_PATH, ...args], {
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error) {
    return { ok: false, error: `No se pudo ejecutar el cliente Moodle: ${result.error.message}` };
  }
  const raw = result.stdout?.trim();
  if (!raw) {
    return { ok: false, error: `El cliente Moodle no devolvió salida (stderr: ${result.stderr?.split("\n").filter((l) => l.trim()).slice(-5).join(" · ") ?? ""})` };
  }
  try {
    return JSON.parse(raw);
  } catch {
    return { ok: false, error: `El cliente Moodle devolvió algo inesperado: ${raw.slice(0, 200)}` };
  }
}

export function moodleToken(domain: string, username: string, password: string, service = "moodle_mobile_app"): PythonResult {
  return runMoodleScript(["token", "--url", domain, "--username", username, "--password", password, "--service", service]);
}

export function moodleEvents(domain: string, token: string, daysPast = 14, daysAhead = 365): PythonResult {
  return runMoodleScript(["events", "--url", domain, "--token", token, "--days-past", String(daysPast), "--days-ahead", String(daysAhead)]);
}