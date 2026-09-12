import { DateTime } from "luxon";
import { parseActivityDetails, calendarOnlyDetails, isMoodleLoginPage } from "./activities";
import { buildCalendarUrl, inspectCalendarPage, parseCalendarPage } from "./calendar";
import { loginGateway, selectPeriod } from "./gateway";
import { handoffCourse } from "./handoff";
import { chooseTarget, mergeCalendarEvents, monthRange, toRemoteItem } from "./normalize";
import { createUasdTransport } from "./transport";
import type { UasdHttpClient, UasdHttpResponse, UasdTransportOptions } from "./transport";
import {
  UASD_TIME_ZONE,
  UasdError,
} from "./types";
import type { UasdCalendarEvent, UasdCourse, UasdRemoteItem, UasdScrapeInput, UasdScrapeResult, UasdScrapeStats, UasdSelectionRecord } from "./types";

export interface UasdScraperOptions {
  client?: UasdHttpClient;
  transport?: UasdTransportOptions;
}

const MAX_CALENDAR_MONTHS = 24;

export async function scrapeUasd(input: unknown, options: UasdScraperOptions = {}): Promise<UasdScrapeResult> {
  let client = options.client;
  let ownsClient = false;
  const startedAt = Date.now();

  try {
    const normalizedInput = validateUasdInput(input);
    if (!client) {
      client = await createUasdTransport(options.transport);
      ownsClient = true;
    }

    const gatewaySession = await loginGateway(client, normalizedInput);
    const selection = await selectPeriod(client, gatewaySession, normalizedInput.period);
    const courses = await resolveCourses(client, selection);
    const months = monthRange(normalizedInput.from, normalizedInput.to);
    const calendarEvents = await readCalendar(client, courses, months, normalizedInput.from, normalizedInput.to);
    const events = mergeCalendarEvents(calendarEvents);
    const items = await readActivities(client, events, courses);
    const stats = makeStats(client, courses.length, courses.length * months.length, events.length, items.length, startedAt);

    return {
      ok: true,
      period: normalizedInput.period,
      courses,
      items,
      stats,
    };
  } catch (error) {
    return { ok: false, error: errorShape(error) };
  } finally {
    if (ownsClient && client) await client.close().catch(() => undefined);
  }
}

export function validateUasdInput(value: unknown): UasdScrapeInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UasdError("INVALID_INPUT", "La entrada del scraper UASD debe ser un objeto");
  }
  const input = value as Record<string, unknown>;
  const username = requiredInputString(input.username, "username");
  const password = requiredInputString(input.password, "password", false);
  const period = requiredInputString(input.period, "period");
  const from = requiredInputString(input.from, "from");
  const to = requiredInputString(input.to, "to");
  if (!/^\d{4}(10|20)$/.test(period)) throw new UasdError("INVALID_INPUT", "period debe tener formato YYYY10 o YYYY20");

  const fromDate = DateTime.fromISO(from, { zone: UASD_TIME_ZONE });
  const toDate = DateTime.fromISO(to, { zone: UASD_TIME_ZONE });
  if (!fromDate.isValid || !toDate.isValid || toDate < fromDate) {
    throw new UasdError("INVALID_INPUT", "El rango de fechas UASD no es valido");
  }
  if (monthRange(from, to).length > MAX_CALENDAR_MONTHS) {
    throw new UasdError("INVALID_INPUT", `El rango UASD no puede superar ${MAX_CALENDAR_MONTHS} meses`);
  }

  const captcha = optionalInputString(input.captcha);
  return {
    username,
    password,
    period,
    from,
    to,
    ...(captcha === undefined ? {} : { captcha }),
  };
}

async function resolveCourses(client: UasdHttpClient, records: UasdSelectionRecord[]): Promise<UasdCourse[]> {
  const seenRecords = new Set<string>();
  const courses: UasdCourse[] = [];
  const seenCourses = new Set<string>();

  for (const record of records) {
    const recordKey = `${record.CLAVE}:${chooseTarget(record)}`;
    if (seenRecords.has(recordKey)) continue;
    seenRecords.add(recordKey);

    const course = await handoffCourse(client, record);
    const courseKey = `${course.host}:${course.courseId}`;
    if (seenCourses.has(courseKey)) continue;
    seenCourses.add(courseKey);
    courses.push(course);
  }
  return courses;
}

async function readCalendar(
  client: UasdHttpClient,
  courses: UasdCourse[],
  months: DateTime[],
  from: string,
  to: string,
): Promise<UasdCalendarEvent[]> {
  const events: UasdCalendarEvent[] = [];
  const fromDate = DateTime.fromISO(from, { zone: UASD_TIME_ZONE }).startOf("day");
  const toDate = DateTime.fromISO(to, { zone: UASD_TIME_ZONE }).endOf("day");

  for (const course of courses) {
    for (const month of months) {
      const response = await client.request(buildCalendarUrl(course, month), {
        method: "GET",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "es-DO,es;q=0.9,en;q=0.8",
          Referer: course.url,
        },
      });
      assertMoodlePage(response, "el calendario");
      const pageEvents = parseCalendarPage(response.body, course);
      const inspection = inspectCalendarPage(response.body);
      if (!inspection.hasCalendarMarker && pageEvents.length === 0) {
        throw new UasdError("UNEXPECTED_RESPONSE", `La respuesta de calendario no tiene estructura Moodle (${inspection.eventItemCount} items, ${inspection.activityLinkCount} enlaces)`);
      }
      for (const event of pageEvents) {
        const eventDate = DateTime.fromISO(event.eventDate, { setZone: true });
        if (eventDate.isValid && eventDate >= fromDate && eventDate <= toDate) events.push(event);
      }
    }
  }
  return events;
}

async function readActivities(client: UasdHttpClient, events: UasdCalendarEvent[], courses: UasdCourse[]): Promise<UasdRemoteItem[]> {
  const courseNames = new Map(courses.map((course) => [course.courseId, course.name]));
  const items: UasdRemoteItem[] = [];
  for (const event of events) {
    let details;
    try {
      const response = await client.request(event.url, {
        method: "GET",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "es-DO,es;q=0.9,en;q=0.8",
          Referer: event.url,
        },
      });
      assertMoodlePage(response, "la actividad");
      details = parseActivityDetails(response.body, event);
    } catch (error) {
      if (!(error instanceof UasdError) || (error.status !== 404 && error.code !== "PARSE_ERROR")) throw error;
      details = calendarOnlyDetails(event);
    }

    items.push(toRemoteItem(event, details, courseNames.get(event.courseId) ?? null));
  }
  return items;
}

function assertMoodlePage(response: UasdHttpResponse, operation: string): void {
  if (response.status === 429) throw new UasdError("RATE_LIMITED", `Moodle UASD limito ${operation}`, true, response.status);
  if (response.status === 401) throw new UasdError("AUTH_FAILED", `La sesion UASD expiro durante ${operation}`, false, response.status);
  if (response.status === 403) throw new UasdError("REMOTE_BLOCKED", `Moodle UASD bloqueo ${operation}`, true, response.status);
  if (response.status === 404) throw new UasdError("HTTP_ERROR", `Moodle UASD no encontro ${operation}`, false, response.status);
  if (response.status < 200 || response.status >= 300) {
    throw new UasdError("HTTP_ERROR", `Moodle UASD devolvio HTTP ${response.status} durante ${operation}`, response.status >= 500, response.status);
  }
  if (isMoodleLoginPage(response.url, response.body)) {
    throw new UasdError("AUTH_FAILED", `La sesion UASD expiro durante ${operation}`);
  }
  const preview = response.body.slice(0, 20_000).toLocaleLowerCase();
  if (preview.includes("just a moment") || preview.includes("cf-chl-") || preview.includes("access denied")) {
    throw new UasdError("REMOTE_BLOCKED", `El acceso UASD fue bloqueado durante ${operation}`, true);
  }
}

function makeStats(
  client: UasdHttpClient,
  courses: number,
  calendarPages: number,
  calendarEvents: number,
  items: number,
  startedAt: number,
): UasdScrapeStats {
  return {
    requests: client.stats.requests,
    redirects: client.stats.redirects,
    courses,
    calendarPages,
    calendarEvents,
    activityPages: items,
    items,
    durationMs: Date.now() - startedAt,
  };
}

function errorShape(error: unknown) {
  if (error instanceof UasdError) return error.toJSON();
  return new UasdError("TRANSPORT_ERROR", "El scraper UASD fallo sin una causa identificable", true).toJSON();
}

function requiredInputString(value: unknown, name: string, trim = true): string {
  if (typeof value !== "string" || value.length === 0 || (trim && value.trim().length === 0)) {
    throw new UasdError("INVALID_INPUT", `${name} es obligatorio`);
  }
  return trim ? value.trim() : value;
}

function optionalInputString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length === 0) throw new UasdError("INVALID_INPUT", "captcha debe ser texto no vacio");
  return value.trim();
}
