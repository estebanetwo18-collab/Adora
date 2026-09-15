import { NextResponse } from "next/server";
import { checkCredentials, createSessionValue, COOKIE_NAME } from "@/lib/adora-agenda/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Solicitud inválida." }, { status: 400 });
  }

  const { username, password } = (body as { username?: unknown; password?: unknown }) || {};
  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ ok: false, message: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  if (!checkCredentials(username, password)) {
    return NextResponse.json({ ok: false, message: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  const { value, maxAgeSeconds } = await createSessionValue();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
  return res;
}
