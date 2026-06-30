import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/auth/session";

/**
 * Auth gate (Next.js 16 Proxy, formerly middleware).
 *
 * Every route except the explicit public list is redirected to /login when
 * there is no valid session. Static assets, Next internals, the cron endpoint,
 * and the login page itself are excluded so the app can boot and assets can
 * load without a session.
 */

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];
const STATIC_PREFIXES = ["/_next", "/static", "/favicon.ico", "/manifest", "/robots.txt", "/sitemap.xml"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and public files must always pass through.
  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Cron has its own CRON_SECRET check.
  if (pathname.startsWith("/api/cron/")) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const token = request.cookies.get("session")?.value;
  const session = token ? await decrypt(token) : null;
  const isAuthenticated = Boolean(session?.userId);

  if (!isAuthenticated && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest).*)"],
};
