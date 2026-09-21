"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCrmState, api } from "@/lib/adora-agenda/client";
import { CrmStateGate } from "./CrmStateGate";
import { INTERNAL_CLIENT_ID, type ClientAgendaState, type Opportunity, type PipelineStageId } from "@/lib/adora-agenda/types";
import { formatColones, formatDateEs } from "@/lib/adora-agenda/format";

type OppForm = {
  title: string;
  contactId: string;
  ownerId: string;
  stage: PipelineStageId;
  value: string;
  closeDate: string;
  probability: string;
  lossReason: string;
  notes: string;
};

function emptyForm(stage: PipelineStageId, contactId = ""): OppForm {
  return { title: "", contactId, ownerId: "", stage, value: "0", closeDate: "", probability: "20", lossReason: "", notes: "" };
}
function toForm(o: Opportunity): OppForm {
  return {
    title: o.title,
    contactId: o.contactId,
    ownerId: o.ownerId,
    stage: o.stage,
    value: String(o.value),
    closeDate: o.closeDate,
    probability: String(o.probability),
    lossReason: o.lossReason,
    notes: o.notes,
  };
}
function fromForm(f: OppForm) {
  return {
    title: f.title.trim(),
    contactId: f.contactId,
    ownerId: f.ownerId,
    stage: f.stage,
    value: Math.max(0, Math.round(Number(f.value) || 0)),
    closeDate: f.closeDate,
    probability: Math.min(100, Math.max(0, Math.round(Number(f.probability) || 0))),
    lossReason: f.lossReason.trim(),
    notes: f.notes.trim(),
  };
}

export function Oportunidades() {
  return (
    <div className="page">
      <div className="page-head">
        <h1>Oportunidades</h1>
        <p className="page-sub">Pipeline de prospectos — de nuevo contacto a cliente ganado.</p>
      </div>
      <Suspense fallback={<div className="loading-state">Cargando…</div>}>
        <OportunidadesData />
      </Suspense>
    </div>
  );
}

function OportunidadesData() {
  const { state, loadError, fetchState, applyMutation } = useCrmState();
  const searchParams = useSearchParams();
  return (
    <CrmStateGate state={state} loadError={loadError} onRetry={() => fetchState()}>
      {(state) => <OportunidadesBody state={state} applyMutation={applyMutation} prefillContactId={searchParams.get("contactId")} />}
    </CrmStateGate>
  );
}

function OportunidadesBody({
  state,
  applyMutation,
  prefillContactId,
}: {
  state: ClientAgendaState;
  applyMutation: ReturnType<typeof useCrmState>["applyMutation"];
  prefillContactId: string | null;
}) {
  const contacts = useMemo(() => state.clients.filter((c) => c.id !== INTERNAL_CLIENT_ID), [state.clients]);
  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const userById = useMemo(() => new Map(state.users.map((u) => [u.id, u])), [state.users]);

  const [modalOpen, setModalOpen] = useState(Boolean(prefillContactId));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<OppForm>(emptyForm(state.settings.pipelineStages[0]?.id || "nuevo", prefillContactId || ""));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const totalOpenValue = state.opportunities
    .filter((o) => !state.settings.pipelineStages.find((s) => s.id === o.stage)?.isWon)
    .filter((o) => !state.settings.pipelineStages.find((s) => s.id === o.stage)?.isLost)
    .reduce((sum, o) => sum + o.value, 0);

  function openCreate(stage?: PipelineStageId) {
    setEditingId(null);
    setForm(emptyForm(stage || state.settings.pipelineStages[0]?.id || "nuevo"));
    setFormError(null);
    setModalOpen(true);
  }
  function openEdit(o: Opportunity) {
    setEditingId(o.id);
    setForm(toForm(o));
    setFormError(null);
    setModalOpen(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError("El título es obligatorio.");
      return;
    }
    if (!form.contactId) {
      setFormError("Selecciona un contacto.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = fromForm(form);
    const result = editingId
      ? await applyMutation(() => api(`/api/adora-agenda/opportunities/${editingId}`, "PATCH", payload))
      : await applyMutation(() => api("/api/adora-agenda/opportunities", "POST", payload));
    setSaving(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setModalOpen(false);
  }

  async function deleteOpportunity(id: string) {
    if (!confirm("¿Eliminar esta oportunidad?")) return;
    const result = await applyMutation(() => api(`/api/adora-agenda/opportunities/${id}`, "DELETE"));
    if (result.ok) setModalOpen(false);
  }

  async function moveStage(o: Opportunity, stage: PipelineStageId) {
    if (o.stage === stage) return;
    await applyMutation(() =>
      api(`/api/adora-agenda/opportunities/${o.id}`, "PATCH", { ...fromForm(toForm(o)), stage }),
    );
    const stageConfig = state.settings.pipelineStages.find((s) => s.id === stage);
    if (stageConfig?.isLost) openEdit({ ...o, stage });
  }

  return (
    <>
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="card stat-card">
          <span className="stat-label">Oportunidades</span>
          <span className="stat-value">{state.opportunities.length}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Valor en pipeline abierto</span>
          <span className="stat-value" style={{ fontSize: 22 }}>
            {formatColones(totalOpenValue)}
          </span>
        </div>
        <button className="new-appt-btn" style={{ alignSelf: "center" }} onClick={() => openCreate()}>
          <span className="plus">+</span> Nueva oportunidad
        </button>
      </div>

      <div className="kanban-scroll">
        <div className="kanban-board">
          {state.settings.pipelineStages.map((stage) => {
            const stageOpps = state.opportunities.filter((o) => o.stage === stage.id);
            const stageValue = stageOpps.reduce((sum, o) => sum + o.value, 0);
            return (
              <div
                key={stage.id}
                className="kanban-column"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const opp = state.opportunities.find((o) => o.id === dragId);
                  if (opp) moveStage(opp, stage.id);
                  setDragId(null);
                }}
              >
                <div className="kanban-column-head">
                  <span className="row-title">{stage.label}</span>
                  <span className="row-sub">
                    {stageOpps.length} · {formatColones(stageValue)}
                  </span>
                </div>
                <div className="kanban-cards">
                  {stageOpps.length === 0 && <div className="empty-list">Sin oportunidades.</div>}
                  {stageOpps.map((o) => (
                    <div
                      key={o.id}
                      className="kanban-card"
                      draggable
                      onDragStart={() => setDragId(o.id)}
                      onClick={() => openEdit(o)}
                    >
                      <span className="row-title">{o.title}</span>
                      <span className="row-sub">{contactById.get(o.contactId)?.name || "Contacto eliminado"}</span>
                      <span className="row-sub">{formatColones(o.value)}</span>
                      {o.closeDate && <span className="row-sub">Cierra {formatDateEs(o.closeDate)}</span>}
                      {o.ownerId && <span className="row-sub">{userById.get(o.ownerId)?.name}</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`overlay ${modalOpen ? "open" : ""}`} onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
        <div className="modal">
          <h2>{editingId ? "Editar oportunidad" : "Nueva oportunidad"}</h2>
          <form onSubmit={submitForm}>
            {formError && <div className="login-error">{formError}</div>}
            <div className="field">
              <label htmlFor="oppTitle">Título</label>
              <input id="oppTitle" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} autoFocus />
            </div>
            <div className="field">
              <label htmlFor="oppContact">Contacto</label>
              <select id="oppContact" value={form.contactId} onChange={(e) => setForm((f) => ({ ...f, contactId: e.target.value }))}>
                <option value="">Selecciona…</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="row2">
              <div className="field">
                <label htmlFor="oppStage">Etapa</label>
                <select id="oppStage" value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as PipelineStageId }))}>
                  {state.settings.pipelineStages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="oppOwner">Responsable</label>
                <select id="oppOwner" value={form.ownerId} onChange={(e) => setForm((f) => ({ ...f, ownerId: e.target.value }))}>
                  <option value="">Sin asignar</option>
                  {state.users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="row2">
              <div className="field">
                <label htmlFor="oppValue">Valor estimado (₡)</label>
                <input id="oppValue" type="number" min={0} value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
              </div>
              <div className="field">
                <label htmlFor="oppProbability">Probabilidad (%)</label>
                <input
                  id="oppProbability"
                  type="number"
                  min={0}
                  max={100}
                  value={form.probability}
                  onChange={(e) => setForm((f) => ({ ...f, probability: e.target.value }))}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="oppCloseDate">Fecha estimada de cierre</label>
              <input id="oppCloseDate" type="date" value={form.closeDate} onChange={(e) => setForm((f) => ({ ...f, closeDate: e.target.value }))} />
            </div>
            {state.settings.pipelineStages.find((s) => s.id === form.stage)?.isLost && (
              <div className="field">
                <label htmlFor="oppLossReason">Motivo de pérdida</label>
                <input id="oppLossReason" value={form.lossReason} onChange={(e) => setForm((f) => ({ ...f, lossReason: e.target.value }))} />
              </div>
            )}
            <div className="field">
              <label htmlFor="oppNotes">Notas</label>
              <textarea id="oppNotes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="modal-actions">
              {editingId && (
                <button type="button" className="btn-danger" onClick={() => deleteOpportunity(editingId)} disabled={saving}>
                  Eliminar
                </button>
              )}
              <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
