"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCrmState } from "@/lib/adora-agenda/client";
import { CrmStateGate } from "./CrmStateGate";
import { INTERNAL_CLIENT_ID } from "@/lib/adora-agenda/types";
import { formatColones, formatDateEs, timeAgoEs, todayIso } from "@/lib/adora-agenda/format";

const ACTIVITY_ICON: Record<string, string> = {
  llamada: "📞",
  reunion: "🤝",
  correo: "✉️",
  mensaje: "💬",
  nota: "📝",
};

export function Dashboard() {
  const { state, loadError, fetchState } = useCrmState();

  return (
    <div className="page">
      <div className="page-head">
        <h1>Dashboard</h1>
        <p className="page-sub">Resumen general de Adora — clientes, prospectos, oportunidades y tareas.</p>
      </div>
      <CrmStateGate state={state} loadError={loadError} onRetry={() => fetchState()}>
        {(state) => <DashboardBody state={state} />}
      </CrmStateGate>
    </div>
  );
}

function DashboardBody({ state }: { state: import("@/lib/adora-agenda/types").ClientAgendaState }) {
  const contacts = useMemo(() => state.clients.filter((c) => c.id !== INTERNAL_CLIENT_ID), [state.clients]);
  const activeClients = contacts.filter((c) => c.status === "cliente").length;
  const prospects = contacts.filter((c) => c.status === "prospecto").length;
  const openOpportunities = state.opportunities.filter((o) => o.stage !== "ganado" && o.stage !== "perdido");
  const pendingTasks = state.tasks.filter((t) => t.status !== "completada").length;
  const pipelineValue = openOpportunities.reduce((sum, o) => sum + o.value, 0);

  const clientById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const userById = useMemo(() => new Map(state.users.map((u) => [u.id, u])), [state.users]);

  const today = todayIso();
  const upcomingAppointments = useMemo(
    () =>
      state.appointments
        .filter((a) => a.clientId !== INTERNAL_CLIENT_ID && a.date >= today)
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        .slice(0, 6),
    [state.appointments, today],
  );

  const recentActivities = useMemo(
    () => [...state.activities].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
    [state.activities],
  );

  const pipelineByStage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of state.opportunities) counts.set(o.stage, (counts.get(o.stage) || 0) + 1);
    return state.settings.pipelineStages.map((s) => ({ ...s, count: counts.get(s.id) || 0 }));
  }, [state.opportunities, state.settings]);

  return (
    <>
      <div className="stat-grid">
        <div className="card stat-card">
          <span className="stat-label">Clientes activos</span>
          <span className="stat-value">{activeClients}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Prospectos</span>
          <span className="stat-value">{prospects}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Oportunidades abiertas</span>
          <span className="stat-value">{openOpportunities.length}</span>
          <span className="stat-foot">{formatColones(pipelineValue)} en pipeline</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Tareas pendientes</span>
          <span className="stat-value">{pendingTasks}</span>
        </div>
      </div>

      <div className="dash-columns">
        <div className="card">
          <h3>Pipeline por etapa</h3>
          {pipelineByStage.every((s) => s.count === 0) && <div className="empty-list">Sin oportunidades todavía.</div>}
          <div className="pipeline-bars">
            {pipelineByStage.map((s) => (
              <Link href="/oportunidades" key={s.id} className="pipeline-bar-row">
                <span className="row-sub" style={{ minWidth: 92 }}>
                  {s.label}
                </span>
                <div className="pipeline-bar-track">
                  <div
                    className="pipeline-bar-fill"
                    style={{
                      width: `${Math.min(100, s.count * 18 + (s.count > 0 ? 10 : 0))}%`,
                      background: s.isWon ? "var(--good)" : s.isLost ? "var(--danger)" : "var(--accent)",
                    }}
                  />
                </div>
                <span className="row-title">{s.count}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Próximas citas</h3>
          {upcomingAppointments.length === 0 && <div className="empty-list">Sin citas próximas.</div>}
          {upcomingAppointments.map((a) => {
            const c = clientById.get(a.clientId);
            return (
              <Link href="/agenda" key={a.id} className="list-row-btn">
                <span className="avatar">{(c?.name || "?").slice(0, 2).toUpperCase()}</span>
                <span className="service-row-text">
                  <span className="row-title">{c?.name || "Contacto eliminado"}</span>
                  <span className="row-sub">
                    {formatDateEs(a.date)} · {a.time}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>

        <div className="card">
          <h3>Actividad reciente</h3>
          {recentActivities.length === 0 && <div className="empty-list">Sin actividad todavía.</div>}
          {recentActivities.map((act) => {
            const c = clientById.get(act.contactId);
            const owner = userById.get(act.ownerId);
            return (
              <div className="timeline-row" key={act.id}>
                <span className="timeline-icon">{ACTIVITY_ICON[act.type] || "•"}</span>
                <span className="service-row-text">
                  <span className="row-title">{act.subject}</span>
                  <span className="row-sub">
                    {c?.name || "Contacto eliminado"} {owner ? `· ${owner.name}` : ""} · {timeAgoEs(act.createdAt)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
