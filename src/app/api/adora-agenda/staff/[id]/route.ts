import { NextResponse } from "next/server";
import { getState, setState } from "@/lib/adora-agenda/store";
import { staffInputSchema } from "@/lib/adora-agenda/schemas";
import { errorResponse, readJson } from "@/lib/adora-agenda/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const json = await readJson(request);
    const parsed = staffInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, code: "invalid_input", message: parsed.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 422 },
      );
    }
    const state = await getState();
    if (!state.staff.some((s) => s.id === id)) {
      return NextResponse.json({ ok: false, code: "not_found", message: "Integrante no encontrada." }, { status: 404 });
    }
    const initials = (parsed.data.initials || parsed.data.name.slice(0, 2)).toUpperCase();
    const nextState = {
      ...state,
      staff: state.staff.map((s) => (s.id === id ? { id, ...parsed.data, initials } : s)),
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
    const nextState = { ...state, staff: state.staff.filter((s) => s.id !== id) };
    await setState(nextState);
    return NextResponse.json({ ok: true, state: nextState });
  } catch (err) {
    return errorResponse(err);
  }
}
