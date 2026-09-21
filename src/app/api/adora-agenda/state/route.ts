import { NextResponse } from "next/server";
import { getState, KvNotConfiguredError } from "@/lib/adora-agenda/store";
import { getSession, toClientState } from "@/lib/adora-agenda/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    const state = await getState();
    return NextResponse.json({ ok: true, state: toClientState(state, session) });
  } catch (err) {
    if (err instanceof KvNotConfiguredError) {
      return NextResponse.json({ ok: false, code: "kv_not_configured", message: err.message }, { status: 503 });
    }
    console.error("[adora-agenda] state route", err);
    return NextResponse.json(
      { ok: false, code: "unknown", message: "No se pudo cargar la agenda." },
      { status: 500 },
    );
  }
}
