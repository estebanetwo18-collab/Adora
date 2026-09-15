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
    "/((?!login|api/auth/login|_next/static|_next/image|favicon.ico).*)",
  ],
};
