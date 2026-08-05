import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOP_BY_HOP_HEADERS = [
  "connection",
  "keep-alive",
  "transfer-encoding",
  "content-length",
  "content-encoding",
  "te",
  "trailer",
  "upgrade",
];

function resolveBackendUrl(): string | null {
  const raw = (process.env.BACKEND_INTERNAL_URL ?? "").trim();
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  try {
    const url = new URL(withScheme.replace(/\/+$/, ""));
    if (url.hostname) {
      return `${url.protocol}//${url.host}`;
    }
  } catch {
    return null;
  }
  return null;
}

async function proxyHandler(request: NextRequest) {
  const backendUrl = resolveBackendUrl() ?? "http://localhost:4000";
  const { pathname, search } = request.nextUrl;
  const target = `${backendUrl}${pathname}${search}`;

  const headers = new Headers();
  const excluded = new Set(["host", ...HOP_BY_HOP_HEADERS]);
  for (const [key, value] of request.headers.entries()) {
    if (!excluded.has(key.toLowerCase())) headers.set(key, value);
  }
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);
  headers.set("accept-encoding", "identity");

  try {
    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      ...(hasBody ? { duplex: "half" } : {}),
      redirect: "manual",
    } as RequestInit);

    const body = await upstream.arrayBuffer();

    const responseHeaders = new Headers();
    for (const [key, value] of upstream.headers.entries()) {
      if (key.toLowerCase() !== "set-cookie" && !HOP_BY_HOP_HEADERS.includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    }
    const cookies = upstream.headers.getSetCookie?.() ?? [];
    for (const cookie of cookies) responseHeaders.append("set-cookie", cookie);

    return new NextResponse(body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(
      `[proxy] BACKEND_INTERNAL_URL='${process.env.BACKEND_INTERNAL_URL ?? ""}' target='${target}' -> ${error instanceof Error ? error.message : error}`,
    );
    return NextResponse.json(
      { ok: false, error: { code: "PROXY_UPSTREAM_ERROR", message: `No se pudo conectar con el backend: ${error instanceof Error ? error.message : String(error)}` } },
      { status: 502 },
    );
  }
}

export const GET = proxyHandler;
export const POST = proxyHandler;
export const PUT = proxyHandler;
export const PATCH = proxyHandler;
export const DELETE = proxyHandler;
export const OPTIONS = proxyHandler;
export const HEAD = proxyHandler;