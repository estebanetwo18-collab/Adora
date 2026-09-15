import { NextResponse } from "next/server";
import { getState, setState, genId } from "@/lib/adora-agenda/store";
import { staffInputSchema } from "@/lib/adora-agenda/schemas";
import { errorResponse, readJson } from "@/lib/adora-agenda/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const json = await readJson(request);
    const parsed = staffInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, code: "invalid_input", message: parsed.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 422 },
      );
    }
    const state = await getState();
    const initials = (parsed.data.initials || parsed.data.name.slice(0, 2)).toUpperCase();
    const member = { id: genId("staff"), ...parsed.data, initials };
    const nextState = { ...state, staff: [...state.staff, member] };
    await setState(nextState);
    return NextResponse.json({ ok: true, state: nextState, member });
  } catch (err) {
    return errorResponse(err);
  }
}
