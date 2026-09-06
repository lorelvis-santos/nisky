import { fetch as wreqFetch, type Response } from "wreq-js";
import type { BrowserAlias, BrowserProfile } from "wreq-js";
import type { MoodleResult } from "./moodle.types";

const TOKEN_PATH = "/login/token.php";
const EVENTS_PATH = "/webservice/rest/server.php";
const BROWSER = (process.env.MOODLE_WREQ_BROWSER ?? "chrome_149") as BrowserProfile | BrowserAlias;
const PROXY_URL = process.env.MOODLE_PROXY_URL?.trim();
const PREFIX_RE = /^(Vencimiento de|Se cierra|Se abre|Inicio de)\s+/i;
const KIND_MAP: Record<string, string> = {
  mod_assign: "assignment",
  mod_quiz: "quiz",
  mod_forum: "forum",
  mod_url: "resource",
  mod_page: "resource",
  mod_resource: "resource",
  mod_folder: "resource",
  mod_book: "resource",
};

function endpoint(base: string, path: string) {
  return `${base.replace(/\/+$/, "")}${path}`;
}

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "[url inválida]";
  }
}

function responseContext(response: Response, body: string) {
  const normalizedBody = body.replace(/\s+/g, " ").trim();
  const preview = normalizedBody.length > 180 ? `${normalizedBody.slice(0, 180)}...` : normalizedBody;
  return `url=${safeUrl(response.url)}; server=${response.headers.get("server") ?? "unknown"}; content-type=${response.headers.get("content-type") ?? "unknown"}; body=${JSON.stringify(preview)}`;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function cleanTitle(name: unknown) {
  const title = typeof name === "string" ? name : "";
  return PREFIX_RE.test(title) ? title.replace(PREFIX_RE, "").trim() || title : title;
}

function normalizeEvent(event: Record<string, unknown>) {
  const course = record(event.course);
  const action = record(event.action);
  const icon = record(event.icon);
  const url = typeof event.url === "string" ? event.url : "";
  const cmid = /\/mod\/[a-z_]+\/view\.php\?id=(\d+)/.exec(url)?.[1];
  const instance = event.instance;
  const component = typeof event.component === "string" ? event.component : null;
  const eventType = typeof event.eventtype === "string" ? event.eventtype : typeof event.normalisedeventtype === "string" ? event.normalisedeventtype : null;
  const rawName = typeof event.name === "string" ? event.name : "";
  const courseId = course.id;
  const dueTimestamp = typeof event.timesort === "number" && event.timesort ? event.timesort : typeof event.timestart === "number" && event.timestart ? event.timestart : null;

  return {
    task_key: courseId && instance ? `${courseId}:${instance}:${eventType}` : `event:${event.id ?? "unknown"}`,
    moodle_event_id: typeof event.id === "number" ? event.id : null,
    name: rawName,
    title: typeof event.activityname === "string" && event.activityname ? event.activityname : cleanTitle(rawName),
    kind: KIND_MAP[component ?? ""] ?? "other",
    component,
    event_type: eventType,
    course_id: typeof courseId === "number" ? courseId : null,
    course: typeof course.fullname === "string" ? course.fullname : null,
    course_short: typeof course.shortname === "string" ? course.shortname : null,
    cmid: cmid ? Number(cmid) : typeof instance === "number" ? instance : null,
    instance: typeof instance === "number" ? instance : null,
    due_utc: dueTimestamp ? new Date(dueTimestamp * 1000).toISOString() : null,
    url,
    viewurl: typeof event.viewurl === "string" ? event.viewurl : null,
    actionable: Object.keys(action).length > 0 ? Boolean(action.actionable) : null,
    action_name: typeof action.name === "string" ? action.name : null,
    overdue: Boolean(event.overdue),
    icon_purpose: typeof icon.purpose === "string" ? icon.purpose : null,
  };
}

async function get(base: string, path: string, params: Record<string, string | number>) {
  const target = new URL(endpoint(base, path));
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, String(value));

  const response = await wreqFetch(target, {
    browser: BROWSER,
    ...(PROXY_URL ? { proxy: PROXY_URL } : {}),
    timeout: 40_000,
    redirect: "follow",
    headers: {
      Accept: "application/json",
      "Accept-Language": "es-DO,es;q=0.9,en;q=0.8",
      Referer: `${base.replace(/\/+$/, "")}/`,
    },
  });
  const body = await response.text();
  const server = response.headers.get("server") ?? "unknown";
  const contentType = response.headers.get("content-type") ?? "unknown";
  console.error(
    `[moodle] client=wreq-js browser=${BROWSER} proxy=${PROXY_URL ? "enabled" : "disabled"} GET ${safeUrl(response.url || target.toString())} -> HTTP ${response.status} server=${server} content-type=${contentType}`,
  );

  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status} desde el servidor Moodle (${responseContext(response, body)})`);
  }

  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    throw new Error(`No se recibió JSON desde Moodle (${responseContext(response, body)})`);
  }
}

export async function moodleTokenWithWreq(
  domain: string,
  username: string,
  password: string,
  service = "moodle_mobile_app",
): Promise<MoodleResult> {
  const data = await get(domain, TOKEN_PATH, { username, password, service });
  if (typeof data.token === "string" && data.token) return { ok: true, token: data.token };
  const message = typeof data.error === "string" ? data.error : typeof data.message === "string" ? data.message : "respuesta inesperada";
  return { ok: false, error: `Moodle rechazó credenciales o el servicio '${service}' está deshabilitado (${message})` };
}

export async function moodleEventsWithWreq(
  domain: string,
  token: string,
  daysPast = 14,
  daysAhead = 365,
): Promise<MoodleResult> {
  const data = await get(domain, EVENTS_PATH, {
    wstoken: token,
    wsfunction: "core_calendar_get_action_events_by_timesort",
    moodlewsrestformat: "json",
    timesortfrom: Math.floor(Date.now() / 1000) - daysPast * 86_400,
    timesortto: Math.floor(Date.now() / 1000) + daysAhead * 86_400,
    limitnum: 50,
  });
  if ("exception" in data || "errorcode" in data) {
    const code = typeof data.errorcode === "string" ? data.errorcode : "unknown";
    const message = typeof data.message === "string" ? data.message : typeof data.error === "string" ? data.error : "respuesta inesperada";
    return { ok: false, error: `Moodle ws Error: ${code} — ${message}` };
  }
  const events = Array.isArray(data.events)
    ? data.events
      .filter((event): event is Record<string, unknown> => Boolean(event && typeof event === "object"))
      .map(normalizeEvent)
    : [];
  return { ok: true, count: events.length, events };
}
