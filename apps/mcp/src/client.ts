const API_URL = process.env.NISKY_API_URL ?? "http://localhost:3000/api/v1";

interface UpstreamResult {
  status: number;
  ok: boolean;
  data: unknown;
  error: { code: string; message: string } | null;
}

export async function nisky(auth: string, path: string, init: RequestInit = {}): Promise<UpstreamResult> {
  if (!auth.startsWith("Bearer ")) {
    return { status: 401, ok: false, data: null, error: { code: "UNAUTHORIZED", message: "Falta el token de acceso" } };
  }

  const headers = new Headers(init.headers);
  headers.set("authorization", auth);
  if (init.body) headers.set("content-type", "application/json");

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  const body = (await response.json().catch(() => null)) as
    | { ok?: boolean; data?: unknown; error?: { code: string; message: string } }
    | null;

  return {
    status: response.status,
    ok: body?.ok === true,
    data: body?.data ?? null,
    error: body?.error ?? { code: "UPSTREAM_ERROR", message: "Error al contactar el backend" },
  };
}

export function textResult(result: UpstreamResult) {
  return JSON.stringify(result.ok ? result.data : result.error, null, 2);
}