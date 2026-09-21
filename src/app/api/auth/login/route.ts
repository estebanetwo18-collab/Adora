import { NextResponse } from "next/server";
import {
  checkMasterCredentials,
  createSessionValue,
  verifyPassword,
  COOKIE_NAME,
  MASTER_SUBJECT,
} from "@/lib/adora-agenda/auth";
import { getState, KvNotConfiguredError } from "@/lib/adora-agenda/store";

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

  let session: { sub: string; role: "administrador" | "supervisor" | "comercial" } | null = null;

  if (checkMasterCredentials(username, password)) {
    session = { sub: MASTER_SUBJECT, role: "administrador" };
  } else {
    try {
      const state = await getState();
      const user = state.users.find((u) => u.username === username && u.active);
      if (user && (await verifyPassword(password, user.passwordHash))) {
        session = { sub: user.id, role: user.role };
      }
    } catch (err) {
      if (err instanceof KvNotConfiguredError) {
        return NextResponse.json({ ok: false, code: "kv_not_configured", message: err.message }, { status: 503 });
      }
      throw err;
    }
  }

  if (!session) {
    return NextResponse.json({ ok: false, message: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  const { value, maxAgeSeconds } = await createSessionValue(session);
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
