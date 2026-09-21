import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSession, COOKIE_NAME, MASTER_SUBJECT } from "@/lib/adora-agenda/auth";
import { getState, KvNotConfiguredError } from "@/lib/adora-agenda/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const jar = await cookies();
  const session = await readSession(jar.get(COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ ok: false, message: "No autenticado." }, { status: 401 });
  }

  if (session.sub === MASTER_SUBJECT) {
    return NextResponse.json({
      ok: true,
      user: { id: MASTER_SUBJECT, name: "Administradora", username: "master", role: "administrador" },
    });
  }

  try {
    const state = await getState();
    const user = state.users.find((u) => u.id === session.sub);
    if (!user) {
      return NextResponse.json({ ok: false, message: "Usuario no encontrado." }, { status: 401 });
    }
    return NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, username: user.username, role: user.role },
    });
  } catch (err) {
    if (err instanceof KvNotConfiguredError) {
      return NextResponse.json({ ok: false, code: "kv_not_configured", message: err.message }, { status: 503 });
    }
    throw err;
  }
}
