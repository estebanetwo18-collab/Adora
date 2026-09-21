import { NextResponse } from "next/server";
import { getState, setState } from "@/lib/adora-agenda/store";
import { opportunityInputSchema } from "@/lib/adora-agenda/schemas";
import { errorResponse, readJson, getSession, toClientState } from "@/lib/adora-agenda/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const json = await readJson(request);
    const parsed = opportunityInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, code: "invalid_input", message: parsed.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 422 },
      );
    }
    const session = await getSession();
    const state = await getState();
    if (!state.opportunities.some((o) => o.id === id)) {
      return NextResponse.json({ ok: false, code: "not_found", message: "Oportunidad no encontrada." }, { status: 404 });
    }
    if (!state.clients.some((c) => c.id === parsed.data.contactId)) {
      return NextResponse.json({ ok: false, code: "invalid_input", message: "El contacto seleccionado no existe." }, { status: 422 });
    }
    const now = new Date().toISOString();
    const nextState = {
      ...state,
      opportunities: state.opportunities.map((o) =>
        o.id === id ? { ...o, ...parsed.data, updatedAt: now, updatedBy: session?.sub || "" } : o,
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
    const { id } = await params;
    const session = await getSession();
    const state = await getState();
    const nextState = { ...state, opportunities: state.opportunities.filter((o) => o.id !== id) };
    await setState(nextState);
    return NextResponse.json({ ok: true, state: toClientState(nextState, session) });
  } catch (err) {
    return errorResponse(err);
  }
}
