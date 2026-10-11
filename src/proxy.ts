import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, isValidSessionValue } from "@/lib/adora-agenda/auth";

export async function proxy(request: NextRequest) {
  const session = request.cookies.get(COOKIE_NAME)?.value;
  const authed = await isValidSessionValue(session);

  if (!authed) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except the login route, the public marketing catalog
    // (/catalogo — no login needed, it's meant to be shared and indexed),
    // and static assets (public/ files, Next's own build assets) — a
    // logged-out request for the logo or favicon must not get redirected
    // to a login-page HTML response.
    "/((?!login|catalogo|api/auth/login|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js)$).*)",
  ],
};
