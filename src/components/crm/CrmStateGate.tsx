"use client";

import type { ClientAgendaState } from "@/lib/adora-agenda/types";

export function CrmStateGate({
  state,
  loadError,
  onRetry,
  children,
}: {
  state: ClientAgendaState | null;
  loadError: { code?: string; message: string } | null;
  onRetry: () => void;
  children: (state: ClientAgendaState) => React.ReactNode;
}) {
  if (loadError) {
    return (
      <div className="card" style={{ maxWidth: 520, margin: "60px auto" }}>
        <h3 style={{ marginBottom: 10 }}>No se pudo cargar</h3>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 14 }}>{loadError.message}</p>
        <button className="btn-primary" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    );
  }
  if (!state) {
    return <div className="loading-state">Cargando…</div>;
  }
  return <>{children(state)}</>;
}
