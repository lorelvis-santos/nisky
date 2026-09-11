const API_URL = process.env.NISKY_API_URL ?? "http://localhost:4000/api/v1";
const UPSTREAM_TIMEOUT_MS = Math.max(
  1_000,
  Number.parseInt(process.env.MCP_UPSTREAM_TIMEOUT_MS ?? "10000", 10) || 10_000,
);

interface UpstreamResult {
  status: number;
  ok: boolean;
  data: unknown;
  error: { code: string; message: string } | null;
}

export async function nisky(auth: string, path: string, init: RequestInit = {}): Promise<UpstreamResult> {
  if (!auth.startsWith("Bearer ") || !auth.slice("Bearer ".length).trim()) {
    return { status: 401, ok: false, data: null, error: { code: "UNAUTHORIZED", message: "Falta el token de acceso" } };
  }

  const headers = new Headers(init.headers);
  headers.set("authorization", auth);
  if (init.body) headers.set("content-type", "application/json");

  const signal = init.signal ?? AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers, signal });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return {
      status: timedOut ? 504 : 502,
      ok: false,
      data: null,
      error: {
        code: timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE",
        message: timedOut ? "El backend tardó demasiado en responder" : "No se pudo contactar el backend",
      },
    };
  }
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
