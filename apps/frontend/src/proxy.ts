import { NextResponse, type NextRequest } from "next/server";

const authPaths = ["/login", "/register"];
const protectedPaths = [
  "/",
  "/events",
  "/focus",
  "/journal",
  "/knowledge",
  "/projects",
  "/quick-notes",
  "/reminders",
  "/settings",
  "/support",
  "/tasks",
  "/timeblocks",
];

function matchesPath(pathname: string, path: string) {
  return pathname === path || (path !== "/" && pathname.startsWith(`${path}/`));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasRefreshCookie = request.cookies.has("refreshToken");
  const isAuthPath = authPaths.some((path) => matchesPath(pathname, path));
  const isProtectedPath = protectedPaths.some((path) => matchesPath(pathname, path));

  // expired=1 marks an auto-logout after a failed token refresh: the cookie may
  // still be present client-side, so skip the bounce or /login would redirect
  // back to "/" forever.
  if (hasRefreshCookie && isAuthPath && !request.nextUrl.searchParams.has("expired")) {
    return NextResponse.redirect(new URL("/", request.url));
  }
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
