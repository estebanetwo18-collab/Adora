import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { KvNotConfiguredError } from "./store";
import { readSession, COOKIE_NAME, type Session } from "./auth";
import type { AgendaState, ClientAgendaState } from "./types";

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

// Server-side identity for the request — used to stamp createdBy/updatedBy
// and to gate admin-only routes (Usuarios, Configuración). The proxy
// already blocks unauthenticated requests before they reach here, so a
// missing/invalid session at this point means the cookie expired between
// the proxy check and this handler running — treat it as unauthenticated.
export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return readSession(jar.get(COOKIE_NAME)?.value);
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ ok: false, code: "unauthorized", message: "Sesión inválida." }, { status: 401 });
}

export function forbidden(message = "No tienes permiso para hacer esto."): NextResponse {
  return NextResponse.json({ ok: false, code: "forbidden", message }, { status: 403 });
}

// Every response that carries `state` must go through this — it strips
// passwordHash from users (never sent to the browser, regardless of role)
// and, for a "comercial" role, narrows the CRM collections (opportunities,
// activities, tasks) to what that person owns or hasn't been assigned yet.
// The agenda's own clients/appointments/staff/services stay fully visible
// to everyone that's logged in, same as before the CRM existed — any
// staff member has always been able to book any client, and role-gating
// that would break the booking calendar itself.
export function toClientState(state: AgendaState, session: Session | null): ClientAgendaState {
  const { users, ...rest } = state;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructuring-to-omit is the point here
  const publicUsers = users.map(({ passwordHash, ...u }) => u);

  if (session?.role !== "comercial") {
    return { ...rest, users: publicUsers };
  }

  const mine = (ownerId: string) => ownerId === "" || ownerId === session.sub;
  const visibleOpportunities = rest.opportunities.filter((o) => mine(o.ownerId));
  const visibleOpportunityIds = new Set(visibleOpportunities.map((o) => o.id));
  return {
    ...rest,
    opportunities: visibleOpportunities,
    tasks: rest.tasks.filter((t) => mine(t.assigneeId)),
    activities: rest.activities.filter((a) => mine(a.ownerId) || (a.opportunityId && visibleOpportunityIds.has(a.opportunityId))),
    users: publicUsers,
  };
}
