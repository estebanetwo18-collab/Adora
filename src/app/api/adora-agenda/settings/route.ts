import { NextResponse } from "next/server";
import { getState, setState } from "@/lib/adora-agenda/store";
import { settingsInputSchema } from "@/lib/adora-agenda/schemas";
import { errorResponse, readJson, getSession, unauthorized, forbidden, toClientState } from "@/lib/adora-agenda/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (session.role !== "administrador") return forbidden("Solo una administradora puede editar la configuración.");

    const json = await readJson(request);
    const parsed = settingsInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, code: "invalid_input", message: parsed.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 422 },
      );
    }
    const state = await getState();
    const nextState = { ...state, settings: { ...state.settings, ...parsed.data } };
    await setState(nextState);
    return NextResponse.json({ ok: true, state: toClientState(nextState, session) });
  } catch (err) {
    return errorResponse(err);
  }
}
