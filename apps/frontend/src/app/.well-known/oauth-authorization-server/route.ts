import { proxyOAuthRequest } from "@/lib/oauth-proxy";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyOAuthRequest(request, "/.well-known/oauth-authorization-server");
}
