import { NextResponse } from "next/server";
import { getState, setState, genId } from "@/lib/adora-agenda/store";
import { opportunityInputSchema } from "@/lib/adora-agenda/schemas";
import { errorResponse, readJson, getSession, toClientState } from "@/lib/adora-agenda/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
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
    if (!state.clients.some((c) => c.id === parsed.data.contactId)) {
      return NextResponse.json({ ok: false, code: "invalid_input", message: "El contacto seleccionado no existe." }, { status: 422 });
    }
    const now = new Date().toISOString();
    const opportunity = {
      id: genId("opp"),
      ...parsed.data,
      createdAt: now,
      updatedAt: now,
      createdBy: session?.sub || "",
      updatedBy: session?.sub || "",
    };
    const nextState = { ...state, opportunities: [...state.opportunities, opportunity] };
    await setState(nextState);
    return NextResponse.json({ ok: true, state: toClientState(nextState, session), opportunity });
  } catch (err) {
    return errorResponse(err);
  }
}
