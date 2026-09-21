"use client";

import { useState } from "react";
import { useCrmState, useCurrentUser, api, ROLE_LABELS } from "@/lib/adora-agenda/client";
import { CrmStateGate } from "./CrmStateGate";
import type { ClientAgendaState, PublicUser, UserRole } from "@/lib/adora-agenda/types";

export function Configuracion() {
  const { user, loading } = useCurrentUser();
  const { state, loadError, fetchState, applyMutation } = useCrmState();

  if (loading) return <div className="loading-state">Cargando…</div>;
  if (!user || user.role !== "administrador") {
    return (
      <div className="page">
        <div className="card" style={{ maxWidth: 480, margin: "60px auto" }}>
          <h3 style={{ marginBottom: 8 }}>Acceso restringido</h3>
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Solo una administradora puede ver la configuración.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Configuración</h1>
        <p className="page-sub">Usuarios, pipeline, etiquetas y tipos — para el equipo administrador.</p>
      </div>
      <CrmStateGate state={state} loadError={loadError} onRetry={() => fetchState()}>
        {(state) => <ConfiguracionBody state={state} applyMutation={applyMutation} />}
      </CrmStateGate>
    </div>
  );
}

function ConfiguracionBody({
  state,
  applyMutation,
}: {
  state: ClientAgendaState;
  applyMutation: ReturnType<typeof useCrmState>["applyMutation"];
}) {
  return (
    <div className="config-grid">
      <UsersCard users={state.users} applyMutation={applyMutation} />
      <PipelineCard state={state} applyMutation={applyMutation} />
      <TagsCard tags={state.settings.tags} applyMutation={applyMutation} />
    </div>
  );
}

type UserForm = { name: string; username: string; password: string; role: UserRole; active: boolean };
const EMPTY_USER_FORM: UserForm = { name: "", username: "", password: "", role: "comercial", active: true };

function UsersCard({
  users,
  applyMutation,
}: {
  users: PublicUser[];
  applyMutation: ReturnType<typeof useCrmState>["applyMutation"];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_USER_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_USER_FORM);
    setFormError(null);
    setModalOpen(true);
  }
  function openEdit(u: PublicUser) {
    setEditingId(u.id);
    setForm({ name: u.name, username: u.username, password: "", role: u.role, active: u.active });
    setFormError(null);
    setModalOpen(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.username.trim()) {
      setFormError("Nombre y usuario son obligatorios.");
      return;
    }
    if (!editingId && form.password.length < 6) {
      setFormError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      name: form.name.trim(),
      username: form.username.trim(),
      role: form.role,
      active: form.active,
      ...(form.password ? { password: form.password } : {}),
    };
    const result = editingId
      ? await applyMutation(() => api(`/api/adora-agenda/users/${editingId}`, "PATCH", payload))
      : await applyMutation(() => api("/api/adora-agenda/users", "POST", payload));
    setSaving(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setModalOpen(false);
  }

  async function deleteUser(id: string) {
    if (!confirm("¿Eliminar este usuario? Ya no podrá iniciar sesión.")) return;
    const result = await applyMutation(() => api(`/api/adora-agenda/users/${id}`, "DELETE"));
    if (result.ok) setModalOpen(false);
  }

  return (
    <div className="card">
      <div className="mini-cal-head">
        <h3>Usuarios</h3>
        <button className="add-row-btn" style={{ width: "auto", padding: "6px 12px" }} onClick={openCreate}>
          + Agregar usuario
        </button>
      </div>
      {users.length === 0 && <div className="empty-list">Sin usuarios todavía.</div>}
      {users.map((u) => (
        <button key={u.id} type="button" className="list-row-btn" onClick={() => openEdit(u)}>
          <span className="avatar">{u.name.slice(0, 2).toUpperCase()}</span>
          <span className="service-row-text">
            <span className="row-title">
              {u.name} {!u.active && "(inactivo)"}
            </span>
            <span className="row-sub">
              @{u.username} · {ROLE_LABELS[u.role]}
            </span>
          </span>
        </button>
      ))}

      <div className={`overlay ${modalOpen ? "open" : ""}`} onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
        <div className="modal">
          <h2>{editingId ? "Editar usuario" : "Nuevo usuario"}</h2>
          <form onSubmit={submitForm}>
            {formError && <div className="login-error">{formError}</div>}
            <div className="field">
              <label htmlFor="usrName">Nombre</label>
              <input id="usrName" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
            </div>
            <div className="field">
              <label htmlFor="usrUsername">Usuario</label>
              <input id="usrUsername" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
            </div>
            <div className="field">
              <label htmlFor="usrPassword">{editingId ? "Nueva contraseña (opcional)" : "Contraseña"}</label>
              <input
                id="usrPassword"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={editingId ? "Dejar en blanco para no cambiar" : ""}
              />
            </div>
            <div className="row2">
              <div className="field">
                <label htmlFor="usrRole">Rol</label>
                <select id="usrRole" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}>
                  <option value="administrador">Administradora</option>
                  <option value="supervisor">Supervisora</option>
                  <option value="comercial">Comercial</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="usrActive">Estado</label>
                <select
                  id="usrActive"
                  value={form.active ? "1" : "0"}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === "1" }))}
                >
                  <option value="1">Activo</option>
                  <option value="0">Inactivo</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              {editingId && (
                <button type="button" className="btn-danger" onClick={() => deleteUser(editingId)} disabled={saving}>
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
    </div>
  );
}

function PipelineCard({
  state,
  applyMutation,
}: {
  state: ClientAgendaState;
  applyMutation: ReturnType<typeof useCrmState>["applyMutation"];
}) {
  const [labels, setLabels] = useState(() => Object.fromEntries(state.settings.pipelineStages.map((s) => [s.id, s.label])));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await applyMutation(() =>
      api("/api/adora-agenda/settings", "PATCH", {
        pipelineStages: state.settings.pipelineStages.map((s) => ({ ...s, label: labels[s.id] || s.label })),
      }),
    );
    setSaving(false);
  }

  return (
    <div className="card">
      <h3>Etapas del pipeline</h3>
      {state.settings.pipelineStages.map((s) => (
        <div className="field" key={s.id}>
          <label htmlFor={`stage-${s.id}`}>
            {s.isWon ? "Ganada" : s.isLost ? "Perdida" : "Etapa"} ({s.id})
          </label>
          <input
            id={`stage-${s.id}`}
            value={labels[s.id] ?? s.label}
            onChange={(e) => setLabels((l) => ({ ...l, [s.id]: e.target.value }))}
          />
        </div>
      ))}
      <button className="btn-primary" onClick={save} disabled={saving} style={{ width: "100%" }}>
        {saving ? "Guardando…" : "Guardar etapas"}
      </button>
    </div>
  );
}

function TagsCard({
  tags,
  applyMutation,
}: {
  tags: string[];
  applyMutation: ReturnType<typeof useCrmState>["applyMutation"];
}) {
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);

  async function addTag(e: React.FormEvent) {
    e.preventDefault();
    const t = newTag.trim();
    if (!t || tags.includes(t)) return;
    setSaving(true);
    await applyMutation(() => api("/api/adora-agenda/settings", "PATCH", { tags: [...tags, t] }));
    setSaving(false);
    setNewTag("");
  }

  async function removeTag(t: string) {
    setSaving(true);
    await applyMutation(() => api("/api/adora-agenda/settings", "PATCH", { tags: tags.filter((x) => x !== t) }));
    setSaving(false);
  }

  return (
    <div className="card">
      <h3>Etiquetas</h3>
      <div className="tag-row" style={{ marginBottom: 10 }}>
        {tags.length === 0 && <div className="empty-list">Sin etiquetas.</div>}
        {tags.map((t) => (
          <span className="tag-chip removable" key={t}>
            {t}
            <button type="button" onClick={() => removeTag(t)} disabled={saving} aria-label={`Quitar ${t}`}>
              ×
            </button>
          </span>
        ))}
      </div>
      <form onSubmit={addTag} className="inline-activity-form">
        <input placeholder="Nueva etiqueta" value={newTag} onChange={(e) => setNewTag(e.target.value)} />
        <button type="submit" className="btn-primary" disabled={saving}>
          +
        </button>
      </form>
    </div>
  );
}
