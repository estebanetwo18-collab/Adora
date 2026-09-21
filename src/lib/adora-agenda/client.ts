"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClientAgendaState, UserRole } from "./types";

const POLL_MS = 8000;

export type SyncStatus = "loading" | "ready" | "saving" | "error";

export async function api<T = { ok: true; state: ClientAgendaState }>(
  url: string,
  method: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    const message = json?.message || "No se pudo guardar. Intenta de nuevo.";
    const err = new Error(message) as Error & { code?: string };
    err.code = json?.code;
    throw err;
  }
  return json as T;
}

// Shared polling/state pattern for every CRM page (Dashboard, Contactos,
// Oportunidades, Actividades, Configuración). The agenda module keeps its
// own independent copy of this same pattern rather than sharing this hook —
// that was the lowest-risk way to add the CRM without touching the booking
// calendar's already-working data flow.
export function useCrmState() {
  const [state, setState] = useState<ClientAgendaState | null>(null);
  const [loadError, setLoadError] = useState<{ code?: string; message: string } | null>(null);
  const [sync, setSync] = useState<SyncStatus>("loading");

  const fetchState = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const res = await fetch("/api/adora-agenda/state", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (!opts?.silent) setLoadError({ code: json.code, message: json.message });
        setSync("error");
        return;
      }
      setState(json.state);
      setLoadError(null);
      setSync("ready");
    } catch {
      if (!opts?.silent) setLoadError({ message: "No se pudo conectar con el servidor." });
      setSync("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchState();
    const interval = setInterval(() => fetchState({ silent: true }), POLL_MS);
    const onFocus = () => fetchState({ silent: true });
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchState]);

  const applyMutation = useCallback(
    async (run: () => Promise<{ state: ClientAgendaState }>): Promise<{ ok: true } | { ok: false; message: string }> => {
      setSync("saving");
      try {
        const result = await run();
        setState(result.state);
        setSync("ready");
        return { ok: true };
      } catch (err) {
        setSync("ready");
        return { ok: false, message: err instanceof Error ? err.message : "No se pudo guardar." };
      }
    },
    [],
  );

  return { state, loadError, sync, fetchState, applyMutation };
}

export type CurrentUser = { id: string; name: string; username: string; role: UserRole };

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.ok) setUser(json.user);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading };
}

export const ROLE_LABELS: Record<UserRole, string> = {
  administrador: "Administradora",
  supervisor: "Supervisora",
  comercial: "Comercial",
};
