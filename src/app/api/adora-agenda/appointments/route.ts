import { NextResponse } from "next/server";
import { getState, setState, genId } from "@/lib/adora-agenda/store";
import { appointmentInputSchema } from "@/lib/adora-agenda/schemas";
import { errorResponse, readJson } from "@/lib/adora-agenda/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const json = await readJson(request);
    const parsed = appointmentInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, code: "invalid_input", message: parsed.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 422 },
      );
    }
    const state = await getState();
    if (!state.clients.some((c) => c.id === parsed.data.clientId)) {
      return NextResponse.json({ ok: false, code: "invalid_input", message: "La clienta seleccionada no existe." }, { status: 422 });
    }
    const appointment = { id: genId("appt"), ...parsed.data };
    const nextState = { ...state, appointments: [...state.appointments, appointment] };
    await setState(nextState);
    return NextResponse.json({ ok: true, state: nextState, appointment });
  } catch (err) {
    return errorResponse(err);
  }
}
