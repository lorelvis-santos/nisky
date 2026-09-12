import { proxyOAuthRequest } from "@/lib/oauth-proxy";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return proxyOAuthRequest(request, "/oauth/register");
}
