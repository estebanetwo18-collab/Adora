import { NextResponse } from "next/server";
import { getState, setState } from "@/lib/adora-agenda/store";
import { serviceInputSchema } from "@/lib/adora-agenda/schemas";
import { errorResponse, readJson } from "@/lib/adora-agenda/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const json = await readJson(request);
    const parsed = serviceInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, code: "invalid_input", message: parsed.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 422 },
      );
    }
    const state = await getState();
    if (!state.services.some((s) => s.id === id)) {
      return NextResponse.json({ ok: false, code: "not_found", message: "Servicio no encontrado." }, { status: 404 });
    }
    const nextState = {
      ...state,
      services: state.services.map((s) => (s.id === id ? { id, ...parsed.data } : s)),
    };
    await setState(nextState);
    return NextResponse.json({ ok: true, state: nextState });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const state = await getState();
    const nextState = { ...state, services: state.services.filter((s) => s.id !== id) };
    await setState(nextState);
    return NextResponse.json({ ok: true, state: nextState });
  } catch (err) {
    return errorResponse(err);
  }
}
