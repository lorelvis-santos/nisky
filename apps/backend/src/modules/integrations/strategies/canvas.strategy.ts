import { AppError } from "../../../utils/errors/handler";
import { sanitizeDomain } from "../domain";
import type { IntegrationStrategy, RemoteItem } from "./types";

const TIMEOUT_MS = 30_000;

interface CanvasCourse {
  id: number;
  name: string;
}

interface CanvasTodoItem {
  assignment?: { id: number; name: string; due_at?: string | null; html_url?: string; course_id?: number };
  quiz?: { id: number; title: string; due_at?: string | null; html_url?: string; course_id?: number };
  course_id?: number;
  todo_type?: string;
  html_url?: string;
}

async function canvasGet<T>(domain: string, token: string, path: string, params: Record<string, string | number> = {}): Promise<T> {
  const base = domain.endsWith("/") ? domain.slice(0, -1) : domain;
  const url = new URL(`/api/v1${path}`, base);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) {
      if (res.status === 401) throw new AppError("BAD_REQUEST", "Token de Canvas inválido o sin permisos");
      const body = await res.text().catch(() => "");
      throw new AppError("BAD_REQUEST", `Canvas respondió ${res.status}: ${body.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new AppError("BAD_REQUEST", "Canvas no respondió en el tiempo esperado");
    throw new AppError("BAD_REQUEST", error instanceof Error ? error.message : "Error al conectar con Canvas");
  } finally {
    clearTimeout(timer);
  }
}

export const canvasStrategy: IntegrationStrategy = {
  provider: "CANVAS",
  source: "CANVAS",
  prefix: "canvas:",

  async connect(data) {
    const domain = sanitizeDomain(data.domain);
    const token = data.token ?? "";
    if (!token) throw new AppError("BAD_REQUEST", "Canvas requiere un token de acceso");
    await canvasGet(domain, token, "/users/self");
    return { domain, username: data.username ?? "", token };
  },

  async fetchItems(domain, token) {
    const courses = await canvasGet<CanvasCourse[]>(domain, token, "/courses", { enrollment_state: "active", per_page: 100 });
    const courseNames = new Map(courses.map((course) => [course.id, course.name]));

    const items = await canvasGet<CanvasTodoItem[]>(domain, token, "/users/self/todo", { per_page: 100 });

    const out: RemoteItem[] = [];
    for (const item of items) {
      const assignment = item.assignment;
      const quiz = item.quiz;
      if (!assignment && !quiz) continue;
      const activityId = (assignment?.id ?? quiz?.id ?? 0) as number;
      const title = (assignment?.name ?? quiz?.title ?? "Tarea de Canvas") as string;
      const courseId = (assignment?.course_id ?? quiz?.course_id ?? item.course_id ?? 0) as number;
      const courseName = courseNames.get(courseId) ?? "Canvas";
      const activityUrl = assignment?.html_url ?? quiz?.html_url ?? item.html_url ?? null;
      out.push({
        key: `${item.todo_type ?? "todo"}:${courseId}:${activityId}`,
        title,
        description: [courseName, activityUrl ? `Link: ${activityUrl}` : ""].filter(Boolean).join("\n") || null,
        dueDate: (assignment?.due_at ?? quiz?.due_at ?? null) ?? null,
      });
    }
    return out;
  },
};