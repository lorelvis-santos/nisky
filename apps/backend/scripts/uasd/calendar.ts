import { DateTime } from "luxon";
import { activityUrl, calendarDate, calendarEventKey } from "./normalize";
import { UASD_TIME_ZONE, UasdError } from "./types";
import type { UasdCalendarEvent, UasdCourse } from "./types";
import { descendants, findAncestor, findFirst, normalizedText, parseHtml } from "./html";
import type { HtmlElement } from "./html";

export interface CalendarPageInspection {
  hasCalendarMarker: boolean;
  eventItemCount: number;
  activityLinkCount: number;
}

export function buildCalendarUrl(course: UasdCourse, month: DateTime): string {
  const courseUrl = new URL(course.url);
  const coursePath = "/course/view.php";
  const coursePathIndex = courseUrl.pathname.toLowerCase().lastIndexOf(coursePath);
  if (coursePathIndex < 0) throw new UasdError("PARSE_ERROR", "El curso UASD no contiene una ruta Moodle valida");
  const prefix = courseUrl.pathname.slice(0, coursePathIndex);
  const url = new URL(`${prefix}/calendar/view.php`, courseUrl.origin);
  url.searchParams.set("view", "month");
  url.searchParams.set("course", course.courseId);
  url.searchParams.set("time", String(Math.floor(month.startOf("month").toSeconds())));
  return url.toString();
}

export function parseCalendarPage(html: string, course: UasdCourse): UasdCalendarEvent[] {
  const root = parseHtml(html);
  const eventItems = descendants(root).filter((element) => element.attrs["data-region"] === "event-item");
  const links = eventItems.length > 0
    ? eventItems.flatMap((eventItem) => {
        const link = findFirst(eventItem, isActivityEventLink);
        return link ? [link] : [];
      })
    : descendants(root).filter(isActivityEventLink);
  const events: UasdCalendarEvent[] = [];

  for (const link of links) {
    const eventItem = findAncestor(link, (element) => element.attrs["data-region"] === "event-item") ?? link;
    const href = link.attrs.href;
    if (!href) continue;

    let activity: ReturnType<typeof activityUrl>;
    try {
      activity = activityUrl(new URL(href, course.url).toString());
    } catch (error) {
      if (error instanceof UasdError && error.code === "PARSE_ERROR") continue;
      throw error;
    }

    const eventDate = dayDate(eventItem);
    if (!eventDate) continue;
    const eventName = link.attrs.title?.trim() || normalizedText(link) || activity.kind;
    const eventId = link.attrs["data-event-id"] ?? eventItem.attrs["data-event-id"] ?? null;
    const key = calendarEventKey(activity.host, course.courseId, activity.kind, activity.activityId);
    events.push({
      key,
      eventId,
      host: activity.host,
      courseId: course.courseId,
      kind: activity.kind,
      activityId: activity.activityId,
      title: eventName,
      url: activity.url,
      eventDate,
      eventName,
    });
  }

  return events;
}

export function inspectCalendarPage(html: string): CalendarPageInspection {
  const root = parseHtml(html);
  const elements = descendants(root);
  const eventItemCount = elements.filter((element) => element.attrs["data-region"] === "event-item").length;
  const activityLinkCount = elements.filter(isActivityEventLink).length;
  const hasCalendarMarker = elements.some((element) => {
    const region = element.attrs["data-region"];
    return region === "month-view" || region === "month-view-week" || region === "day";
  });
  return { hasCalendarMarker, eventItemCount, activityLinkCount };
}

function dayDate(eventItem: Parameters<typeof findAncestor>[0]): string | null {
  const day = findAncestor(eventItem, (element) => element.attrs["data-region"] === "day" || element.attrs["data-day-timestamp"] !== undefined);
  if (!day) return null;
  const dayLink = findFirst(day, (element) => element.attrs["data-action"] === "view-day-link");
  const source = dayLink ?? day;
  const year = numberAttribute(source.attrs["data-year"]);
  const month = numberAttribute(source.attrs["data-month"]);
  const date = numberAttribute(source.attrs["data-day"]);
  if (year === null || month === null || date === null) {
    const timestamp = numberAttribute(source.attrs["data-timestamp"] ?? day.attrs["data-day-timestamp"]);
    if (timestamp === null) return null;
    const fromTimestamp = DateTime.fromSeconds(timestamp, { zone: UASD_TIME_ZONE });
    if (!fromTimestamp.isValid) return null;
    try {
      return calendarDate(fromTimestamp.year, fromTimestamp.month, fromTimestamp.day);
    } catch {
      return null;
    }
  }
  try {
    return calendarDate(year, month, date);
  } catch {
    return null;
  }
}

function isActivityEventLink(element: HtmlElement): boolean {
  if (element.tagName !== "a" || !element.attrs.href) return false;
  if (element.attrs["data-action"] === "view-event") return true;
  return /(?:^|\/)mod\/(?:assign|quiz|forum)\/view\.php\?id=\d+/i.test(element.attrs.href);
}

function numberAttribute(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
