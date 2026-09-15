import { NextResponse } from "next/server";
import { getState, setState, genId } from "@/lib/adora-agenda/store";
import { serviceInputSchema } from "@/lib/adora-agenda/schemas";
import { errorResponse, readJson } from "@/lib/adora-agenda/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const json = await readJson(request);
    const parsed = serviceInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, code: "invalid_input", message: parsed.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 422 },
      );
    }
    const state = await getState();
    const service = { id: genId("svc"), ...parsed.data };
    const nextState = { ...state, services: [...state.services, service] };
    await setState(nextState);
    return NextResponse.json({ ok: true, state: nextState, service });
  } catch (err) {
    return errorResponse(err);
  }
}
