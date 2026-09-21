import { NextResponse } from "next/server";
import { getState, setState, genId } from "@/lib/adora-agenda/store";
import { userInputSchema } from "@/lib/adora-agenda/schemas";
import { errorResponse, readJson, getSession, unauthorized, forbidden, toClientState } from "@/lib/adora-agenda/api-helpers";
import { hashPassword } from "@/lib/adora-agenda/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (session.role !== "administrador") return forbidden("Solo una administradora puede crear usuarios.");

    const json = await readJson(request);
    const parsed = userInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, code: "invalid_input", message: parsed.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 422 },
      );
    }
    if (!parsed.data.password) {
      return NextResponse.json(
        { ok: false, code: "invalid_input", message: "La contraseña es obligatoria para crear un usuario." },
        { status: 422 },
      );
    }
    const state = await getState();
    if (state.users.some((u) => u.username === parsed.data.username)) {
      return NextResponse.json(
        { ok: false, code: "invalid_input", message: "Ya existe un usuario con ese nombre de usuario." },
        { status: 422 },
      );
    }
    const now = new Date().toISOString();
    const user = {
      id: genId("usr"),
      name: parsed.data.name,
      username: parsed.data.username,
      passwordHash: await hashPassword(parsed.data.password),
      role: parsed.data.role,
      active: parsed.data.active,
      createdAt: now,
    };
    const nextState = { ...state, users: [...state.users, user] };
    await setState(nextState);
    return NextResponse.json({ ok: true, state: toClientState(nextState, session) });
  } catch (err) {
    return errorResponse(err);
  }
}
