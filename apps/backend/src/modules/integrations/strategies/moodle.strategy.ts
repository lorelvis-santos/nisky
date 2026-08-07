import { AppError } from "../../../utils/errors/handler";
import { moodleEvents, moodleToken } from "./moodle.python";
import type { ConnectInput, IntegrationStrategy, RemoteItem } from "./types";

type TaskEvent = {
  task_key: string;
  moodle_event_id?: number | null;
  name: string;
  title: string;
  kind: string;
  component?: string | null;
  event_type?: string | null;
  course_id?: number | null;
  course?: string | null;
  course_short?: string | null;
  cmid?: number | null;
  instance?: number | null;
  due_utc?: string | null;
  url?: string | null;
  viewurl?: string | null;
  overdue?: boolean;
};

function eventToRemoteItem(ev: TaskEvent): RemoteItem {
  return {
    key: ev.task_key,
    title: ev.title ?? ev.name ?? "Tarea sin nombre",
    description: [ev.course, ev.url ? `Link: ${ev.url}` : ""].filter(Boolean).join("\n") || null,
    dueDate: ev.due_utc ?? null,
  };
}

export const moodleStrategy: IntegrationStrategy = {
  provider: "MOODLE",
  source: "MOODLE",
  prefix: "moodle:",

  async connect(data) {
    const domain = data.domain.replace(/\/+$/, "");
    let token = data.token ?? "";
    if (token) {
      const probe = moodleEvents(domain, token, 0, 30);
      if (!probe.ok) {
        throw new AppError("BAD_REQUEST", probe.error);
      }
    } else {
      const result = moodleToken(domain, data.username ?? "", data.password ?? "");
      if (!result.ok) throw new AppError("BAD_REQUEST", result.error);
      if (!result.token) throw new AppError("BAD_REQUEST", "Moodle no devolvió un token");
      token = result.token;
    }
    return { domain, username: data.username ?? "", token };
  },

  async fetchItems(domain, token, window) {
    const result = moodleEvents(domain, token, window.daysPast, window.daysAhead);
    if (!result.ok) throw new Error(result.error);
    const events = (result.events ?? []) as TaskEvent[];
    return events.map(eventToRemoteItem);
  },
};