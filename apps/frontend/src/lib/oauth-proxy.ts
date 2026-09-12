import { NextRequest, NextResponse } from "next/server";

function backendUrl() {
  const raw = (process.env.BACKEND_INTERNAL_URL ?? "http://localhost:4000").trim();
  const value = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  return new URL(value.replace(/\/+$/, ""));
}

export async function proxyOAuthRequest(request: NextRequest, path: string) {
  const target = new URL(path, `${backendUrl().toString()}/`);
  target.search = request.nextUrl.search;
  const headers = new Headers();
  for (const name of ["authorization", "cookie", "content-type", "accept", "user-agent", "x-forwarded-for"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      ...(hasBody ? { duplex: "half" } : {}),
      redirect: "manual",
    } as RequestInit);
    const responseHeaders = new Headers();
    for (const [name, value] of response.headers.entries()) {
      if (!/[\r\n]/.test(value) && name.toLowerCase() !== "content-length") responseHeaders.set(name, value);
    }
    return new NextResponse(await response.arrayBuffer(), {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "temporarily_unavailable", error_description: error instanceof Error ? error.message : "OAuth backend unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
