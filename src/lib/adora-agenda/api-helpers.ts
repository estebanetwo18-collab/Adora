import { NextResponse } from "next/server";
import { KvNotConfiguredError } from "./store";

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof KvNotConfiguredError) {
    return NextResponse.json({ ok: false, code: "kv_not_configured", message: err.message }, { status: 503 });
  }
  console.error("[adora-agenda]", err);
  return NextResponse.json(
    { ok: false, code: "unknown", message: "No se pudo guardar. Intenta de nuevo." },
    { status: 500 },
  );
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
