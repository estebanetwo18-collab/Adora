import { NextResponse } from "next/server";
import { getState, setState, genId } from "@/lib/adora-agenda/store";
import { activityInputSchema } from "@/lib/adora-agenda/schemas";
import { errorResponse, readJson, getSession, toClientState } from "@/lib/adora-agenda/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const json = await readJson(request);
    const parsed = activityInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, code: "invalid_input", message: parsed.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 422 },
      );
    }
    const session = await getSession();
    const state = await getState();
    if (!state.clients.some((c) => c.id === parsed.data.contactId)) {
      return NextResponse.json({ ok: false, code: "invalid_input", message: "El contacto seleccionado no existe." }, { status: 422 });
    }
    const now = new Date().toISOString();
    const activity = { id: genId("act"), ...parsed.data, createdAt: now, createdBy: session?.sub || "" };
    const nextState = { ...state, activities: [...state.activities, activity] };
    await setState(nextState);
    return NextResponse.json({ ok: true, state: toClientState(nextState, session), activity });
  } catch (err) {
    return errorResponse(err);
  }
}
