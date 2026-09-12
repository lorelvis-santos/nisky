import { cleanActivityTitle, parseUasdDates } from "./normalize";
import type { UasdActivityDetails, UasdCalendarEvent } from "./types";
import { findAll, normalizedText, parseHtml } from "./html";

export function parseActivityDetails(html: string, event: UasdCalendarEvent): UasdActivityDetails {
  const root = parseHtml(html);
  const title = extractTitle(root, event.title);
  const candidates = event.kind === "forum" ? [] : findDateCandidates(root);
  let dueDate: string | null = null;
  let openDate: string | null = null;
  let closeDate: string | null = null;
  const completed = hasSubmittedStatus(root);

  for (const candidate of candidates) {
    if (candidate.kind === "due" && !dueDate) dueDate = candidate.date;
    if (candidate.kind === "open" && !openDate) openDate = candidate.date;
    if (candidate.kind === "close" && !closeDate) closeDate = candidate.date;
  }

  if (event.kind === "quiz" && closeDate && !dueDate) dueDate = closeDate;
  return {
    kind: event.kind,
    title,
    url: event.url,
    completed,
    dueDate,
    openDate,
    closeDate,
    source: "detail",
  };
}

export function calendarOnlyDetails(event: UasdCalendarEvent): UasdActivityDetails {
  const dueDate = /(?:pendiente|cierra|vencimiento|due|close)/iu.test(event.eventName) ? event.eventDate : null;
  return {
    kind: event.kind,
    title: cleanActivityTitle(event.title),
    url: event.url,
    completed: false,
    dueDate,
    openDate: null,
    closeDate: null,
    source: "calendar",
  };
}

function hasSubmittedStatus(root: ReturnType<typeof parseHtml>): boolean {
  return findAll(root, (element) => /(?:^|\s)submissionstatussubmitted(?:\s|$)/iu.test(element.attrs.class ?? "")).length > 0;
}

export function isMoodleLoginPage(url: string, html: string): boolean {
  let pathname = "";
  let hostname = "";
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname.toLocaleLowerCase();
    pathname = parsed.pathname.toLocaleLowerCase();
  } catch {
    return true;
  }
  if (/\/login(?:\/index\.php)?$/i.test(pathname)) return true;
  const preview = html.slice(0, 20_000).toLocaleLowerCase();
  if (hostname === "app.uasd.edu.do" && /\/uasdvirtualgateway\/?$/i.test(pathname)) return true;
  return (preview.includes("id=\"login\"") && preview.includes("password")) || (preview.includes("txtidbanner") && preview.includes("txtpassword"));
}

type DateLabelKind = "due" | "open" | "close";

interface DateCandidate {
  kind: DateLabelKind;
  date: string;
  length: number;
}

function findDateCandidates(root: ReturnType<typeof parseHtml>): DateCandidate[] {
  const candidates: DateCandidate[] = [];
  for (const element of findAll(root, () => true)) {
    const text = normalizedText(element);
    if (!text || text.length > 320) continue;
    const dates = parseUasdDates(text);
    if (dates.length !== 1) continue;
    const kind = dateLabelKind(text);
    if (!kind) continue;
    candidates.push({ kind, date: dates[0]!, length: text.length });
  }
  return candidates.sort((left, right) => left.length - right.length);
}

function extractTitle(root: ReturnType<typeof parseHtml>, fallback: string): string {
  const candidates = findAll(root, (element) => {
    if (element.tagName !== "h2") return false;
    return normalizedText(element).length > 0;
  });
  const title = candidates.map(normalizedText).find((value) => !/^(?:uasd|moodle|navegacion)/iu.test(value));
  return cleanActivityTitle(title || fallback);
}

function dateLabelKind(text: string): DateLabelKind | null {
  const label = text.toLocaleLowerCase();
  if (/(?:fecha\s+de\s+entrega|fecha\s+limite|fecha\s+l[ií]mite|vencimiento|due\s+date|deadline|submission\s+due)/u.test(label)) return "due";
  if (/(?:no\s+estar[aá]\s+disponible\s+hasta|disponible\s+desde|se\s+abre|inicio|abre|open|starts?|from)/u.test(label)) return "open";
  if (/(?:se\s+cierra|se\s+cerr[oó]|se\s+cerrar[aá]|cierre|disponible\s+hasta|close|ends?)/u.test(label)) return "close";
  return null;
}
