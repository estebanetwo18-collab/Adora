import { NextResponse } from "next/server";
import { getState, setState } from "@/lib/adora-agenda/store";
import { userInputSchema } from "@/lib/adora-agenda/schemas";
import { errorResponse, readJson, getSession, unauthorized, forbidden, toClientState } from "@/lib/adora-agenda/api-helpers";
import { hashPassword, MASTER_SUBJECT } from "@/lib/adora-agenda/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (session.role !== "administrador") return forbidden("Solo una administradora puede editar usuarios.");

    const { id } = await params;
    const json = await readJson(request);
    const parsed = userInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, code: "invalid_input", message: parsed.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 422 },
      );
    }
    const state = await getState();
    const existing = state.users.find((u) => u.id === id);
    if (!existing) {
      return NextResponse.json({ ok: false, code: "not_found", message: "Usuario no encontrado." }, { status: 404 });
    }
    if (state.users.some((u) => u.id !== id && u.username === parsed.data.username)) {
      return NextResponse.json(
        { ok: false, code: "invalid_input", message: "Ya existe un usuario con ese nombre de usuario." },
        { status: 422 },
      );
    }
    const passwordHash = parsed.data.password ? await hashPassword(parsed.data.password) : existing.passwordHash;
    const nextState = {
      ...state,
      users: state.users.map((u) =>
        u.id === id
          ? { ...u, name: parsed.data.name, username: parsed.data.username, role: parsed.data.role, active: parsed.data.active, passwordHash }
          : u,
      ),
    };
    await setState(nextState);
    return NextResponse.json({ ok: true, state: toClientState(nextState, session) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (session.role !== "administrador") return forbidden("Solo una administradora puede eliminar usuarios.");

    const { id } = await params;
    if (id === MASTER_SUBJECT) {
      return NextResponse.json(
        { ok: false, code: "invalid_input", message: "La cuenta maestra no se puede eliminar." },
        { status: 422 },
      );
    }
    const state = await getState();
    const nextState = { ...state, users: state.users.filter((u) => u.id !== id) };
    await setState(nextState);
    return NextResponse.json({ ok: true, state: toClientState(nextState, session) });
  } catch (err) {
    return errorResponse(err);
  }
}
