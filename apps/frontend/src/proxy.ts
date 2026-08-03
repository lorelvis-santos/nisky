import { NextResponse, type NextRequest } from "next/server";

const authPaths = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasRefreshCookie = request.cookies.has("refreshToken");
  const isAuthPath = authPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const isProtectedPath = pathname === "/" || pathname === "/settings" || pathname.startsWith("/settings/");

  if (hasRefreshCookie && isAuthPath) return NextResponse.redirect(new URL("/", request.url));
  if (!hasRefreshCookie && isProtectedPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
