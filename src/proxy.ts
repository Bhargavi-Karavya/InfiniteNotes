import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { getSessionFromToken } from "@/services/auth";

/**
 * Optimistic admin gate: requires a valid signed session cookie with role ADMIN.
 * Full authorization is re-checked in protected Server Components via requireAdmin().
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminLogin = pathname === "/admin/login";

  if (!pathname.startsWith("/admin") || isAdminLogin) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await getSessionFromToken(token);

  if (!session || session.role !== "ADMIN") {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
