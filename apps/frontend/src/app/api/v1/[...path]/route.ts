import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function proxyHandler(request: NextRequest) {
  const backendUrl = (process.env.BACKEND_INTERNAL_URL ?? "http://localhost:4000").replace(/\/+$/, "");
  const { pathname, search } = request.nextUrl;
  const target = `${backendUrl}${pathname}${search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    ...(hasBody ? { duplex: "half" } : {}),
    redirect: "manual",
  } as RequestInit);

  const responseHeaders = new Headers();
  for (const [key, value] of upstream.headers.entries()) {
    if (key.toLowerCase() !== "set-cookie") responseHeaders.set(key, value);
  }
  const cookies = upstream.headers.getSetCookie?.() ?? [];
  for (const cookie of cookies) responseHeaders.append("set-cookie", cookie);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxyHandler;
export const POST = proxyHandler;
export const PUT = proxyHandler;
export const PATCH = proxyHandler;
export const DELETE = proxyHandler;
export const OPTIONS = proxyHandler;
export const HEAD = proxyHandler;