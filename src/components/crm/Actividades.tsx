"use client";

import { useMemo, useState } from "react";
import { useCrmState, api } from "@/lib/adora-agenda/client";
import { CrmStateGate } from "./CrmStateGate";
import { INTERNAL_CLIENT_ID, type ClientAgendaState, type CrmTask, type TaskStatus, type TaskPriority } from "@/lib/adora-agenda/types";
import { formatDateEs, timeAgoEs, todayIso } from "@/lib/adora-agenda/format";

const ACTIVITY_ICON: Record<string, string> = { llamada: "📞", reunion: "🤝", correo: "✉️", mensaje: "💬", nota: "📝" };
const STATUS_LABEL: Record<TaskStatus, string> = { pendiente: "Pendiente", en_progreso: "En progreso", completada: "Completada" };
const NEXT_STATUS: Record<TaskStatus, TaskStatus> = { pendiente: "en_progreso", en_progreso: "completada", completada: "pendiente" };

type TaskForm = {
  title: string;
  contactId: string;
  opportunityId: string;
  assigneeId: string;
  priority: TaskPriority;
  dueDate: string;
  notes: string;
};
const EMPTY_TASK_FORM: TaskForm = {
  title: "",
  contactId: "",
  opportunityId: "",
  assigneeId: "",
  priority: "media",
  dueDate: "",
  notes: "",
};

export function Actividades() {
  const { state, loadError, fetchState, applyMutation } = useCrmState();
  const [tab, setTab] = useState<"timeline" | "tareas">("tareas");
  return (
    <div className="page">
      <div className="page-head">
        <h1>Actividades</h1>
        <p className="page-sub">Seguimiento de interacciones y tareas del equipo.</p>
      </div>
      <div className="seg-tabs" style={{ marginBottom: 14 }}>
        <button className={`seg-tab ${tab === "tareas" ? "active" : ""}`} onClick={() => setTab("tareas")}>
          Tareas
        </button>
        <button className={`seg-tab ${tab === "timeline" ? "active" : ""}`} onClick={() => setTab("timeline")}>
          Línea de tiempo
        </button>
      </div>
      <CrmStateGate state={state} loadError={loadError} onRetry={() => fetchState()}>
        {(state) => (tab === "tareas" ? <Tareas state={state} applyMutation={applyMutation} /> : <Timeline state={state} />)}
      </CrmStateGate>
    </div>
  );
}

function Tareas({
  state,
  applyMutation,
}: {
  state: ClientAgendaState;
  applyMutation: ReturnType<typeof useCrmState>["applyMutation"];
}) {
  const contacts = useMemo(() => state.clients.filter((c) => c.id !== INTERNAL_CLIENT_ID), [state.clients]);
  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const userById = useMemo(() => new Map(state.users.map((u) => [u.id, u])), [state.users]);

  const [statusFilter, setStatusFilter] = useState<"todas" | TaskStatus>("todas");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskForm>(EMPTY_TASK_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const today = todayIso();
  const tasks = useMemo(
    () =>
      state.tasks
        .filter((t) => statusFilter === "todas" || t.status === statusFilter)
        .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999")),
    [state.tasks, statusFilter],
  );

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_TASK_FORM);
    setFormError(null);
    setModalOpen(true);
  }
  function openEdit(t: CrmTask) {
    setEditingId(t.id);
    setForm({
      title: t.title,
      contactId: t.contactId,
      opportunityId: t.opportunityId,
      assigneeId: t.assigneeId,
      priority: t.priority,
      dueDate: t.dueDate,
      notes: t.notes,
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError("El título es obligatorio.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = { ...form, title: form.title.trim(), status: "pendiente" as TaskStatus };
    const result = editingId
      ? await applyMutation(() => api(`/api/adora-agenda/tasks/${editingId}`, "PATCH", { ...payload, status: state.tasks.find((t) => t.id === editingId)!.status }))
      : await applyMutation(() => api("/api/adora-agenda/tasks", "POST", payload));
    setSaving(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setModalOpen(false);
  }

  async function cycleStatus(t: CrmTask) {
    await applyMutation(() =>
      api(`/api/adora-agenda/tasks/${t.id}`, "PATCH", {
        title: t.title,
        contactId: t.contactId,
        opportunityId: t.opportunityId,
        assigneeId: t.assigneeId,
        priority: t.priority,
        dueDate: t.dueDate,
        notes: t.notes,
        status: NEXT_STATUS[t.status],
      }),
    );
  }

  async function deleteTask(id: string) {
    if (!confirm("¿Eliminar esta tarea?")) return;
    const result = await applyMutation(() => api(`/api/adora-agenda/tasks/${id}`, "DELETE"));
    if (result.ok) setModalOpen(false);
  }

  return (
    <>
      <div className="card">
        <div className="filters-row">
          <div className="seg-tabs">
            {(["todas", "pendiente", "en_progreso", "completada"] as const).map((s) => (
              <button key={s} className={`seg-tab ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>
                {s === "todas" ? "Todas" : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <button className="new-appt-btn" style={{ marginLeft: "auto" }} onClick={openCreate}>
            <span className="plus">+</span> Nueva tarea
          </button>
        </div>
        {tasks.length === 0 ? (
          <div className="empty-list">Sin tareas.</div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tarea</th>
                  <th>Contacto</th>
                  <th>Responsable</th>
                  <th>Prioridad</th>
                  <th>Vence</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => {
                  const overdue = t.dueDate && t.dueDate < today && t.status !== "completada";
                  return (
                    <tr key={t.id} className="data-row" onClick={() => openEdit(t)}>
                      <td>
                        <span className="row-title">{t.title}</span>
                      </td>
                      <td>{contactById.get(t.contactId)?.name || "—"}</td>
                      <td>{userById.get(t.assigneeId)?.name || "Sin asignar"}</td>
                      <td>
                        <span className={`badge badge-prio-${t.priority}`}>{t.priority}</span>
                      </td>
                      <td style={{ color: overdue ? "var(--danger)" : undefined }}>{t.dueDate ? formatDateEs(t.dueDate) : "—"}</td>
                      <td>
                        <button
                          className={`badge badge-task-${t.status}`}
                          style={{ border: "none", cursor: "pointer" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            cycleStatus(t);
                          }}
                        >
                          {STATUS_LABEL[t.status]}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={`overlay ${modalOpen ? "open" : ""}`} onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
        <div className="modal">
          <h2>{editingId ? "Editar tarea" : "Nueva tarea"}</h2>
          <form onSubmit={submitForm}>
            {formError && <div className="login-error">{formError}</div>}
            <div className="field">
              <label htmlFor="taskTitle">Título</label>
              <input id="taskTitle" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} autoFocus />
            </div>
            <div className="field">
              <label htmlFor="taskContact">Contacto (opcional)</label>
              <select id="taskContact" value={form.contactId} onChange={(e) => setForm((f) => ({ ...f, contactId: e.target.value }))}>
                <option value="">Sin contacto</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="row2">
              <div className="field">
                <label htmlFor="taskAssignee">Responsable</label>
                <select id="taskAssignee" value={form.assigneeId} onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}>
                  <option value="">Sin asignar</option>
                  {state.users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="taskPriority">Prioridad</label>
                <select id="taskPriority" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}>
                  {state.settings.taskPriorities.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="taskDue">Fecha límite</label>
              <input id="taskDue" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div className="field">
              <label htmlFor="taskNotes">Notas</label>
              <textarea id="taskNotes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="modal-actions">
              {editingId && (
                <button type="button" className="btn-danger" onClick={() => deleteTask(editingId)} disabled={saving}>
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

function Timeline({ state }: { state: ClientAgendaState }) {
  const contactById = useMemo(() => new Map(state.clients.map((c) => [c.id, c])), [state.clients]);
  const userById = useMemo(() => new Map(state.users.map((u) => [u.id, u])), [state.users]);
  const activities = useMemo(() => [...state.activities].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [state.activities]);

  return (
    <div className="card">
      {activities.length === 0 && <div className="empty-list">Sin actividad registrada. Regístrala desde la ficha de cada contacto.</div>}
      {activities.map((act) => (
        <div className="timeline-row" key={act.id}>
          <span className="timeline-icon">{ACTIVITY_ICON[act.type] || "•"}</span>
          <span className="service-row-text">
            <span className="row-title">{act.subject}</span>
            <span className="row-sub">
              {contactById.get(act.contactId)?.name || "Contacto eliminado"} · {userById.get(act.ownerId)?.name || ""} ·{" "}
              {timeAgoEs(act.createdAt)}
            </span>
            {act.notes && <span className="row-sub">{act.notes}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
