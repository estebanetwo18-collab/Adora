import { NextResponse } from "next/server";
import { getState, setState } from "@/lib/adora-agenda/store";
import { errorResponse, getSession, toClientState } from "@/lib/adora-agenda/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await getSession();
    const state = await getState();
    const nextState = { ...state, activities: state.activities.filter((a) => a.id !== id) };
    await setState(nextState);
    return NextResponse.json({ ok: true, state: toClientState(nextState, session) });
  } catch (err) {
    return errorResponse(err);
  }
}
