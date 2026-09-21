"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCrmState, api } from "@/lib/adora-agenda/client";
import { CrmStateGate } from "./CrmStateGate";
import { INTERNAL_CLIENT_ID, type ClientAgendaState, type Client, type ContactStatus } from "@/lib/adora-agenda/types";
import { formatColones, formatDateEs } from "@/lib/adora-agenda/format";

const STATUS_LABEL: Record<ContactStatus, string> = { prospecto: "Prospecto", cliente: "Cliente", inactivo: "Inactivo" };

type ContactForm = {
  name: string;
  phone: string;
  email: string;
  company: string;
  location: string;
  source: string;
  status: ContactStatus;
  tags: string;
  ownerId: string;
  notes: string;
};

const EMPTY_FORM: ContactForm = {
  name: "",
  phone: "",
  email: "",
  company: "",
  location: "",
  source: "",
  status: "prospecto",
  tags: "",
  ownerId: "",
  notes: "",
};

function toForm(c: Client): ContactForm {
  return {
    name: c.name,
    phone: c.phone,
    email: c.email,
    company: c.company,
    location: c.location,
    source: c.source,
    status: c.status,
    tags: c.tags.join(", "),
    ownerId: c.ownerId,
    notes: c.notes,
  };
}

function fromForm(f: ContactForm) {
  return {
    name: f.name.trim(),
    phone: f.phone.trim(),
    email: f.email.trim(),
    company: f.company.trim(),
    location: f.location.trim(),
    source: f.source.trim(),
    status: f.status,
    tags: f.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    ownerId: f.ownerId,
    notes: f.notes.trim(),
  };
}

export function Contactos() {
  const { state, loadError, fetchState, applyMutation } = useCrmState();
  return (
    <div className="page">
      <div className="page-head">
        <h1>Contactos</h1>
        <p className="page-sub">Clientas y prospectos en un solo lugar.</p>
      </div>
      <CrmStateGate state={state} loadError={loadError} onRetry={() => fetchState()}>
        {(state) => <ContactosBody state={state} applyMutation={applyMutation} />}
      </CrmStateGate>
    </div>
  );
}

function ContactosBody({
  state,
  applyMutation,
}: {
  state: ClientAgendaState;
  applyMutation: ReturnType<typeof useCrmState>["applyMutation"];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | ContactStatus>("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const contacts = useMemo(() => state.clients.filter((c) => c.id !== INTERNAL_CLIENT_ID), [state.clients]);
  const ownerById = useMemo(() => new Map(state.users.map((u) => [u.id, u])), [state.users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts
      .filter((c) => statusFilter === "todos" || c.status === statusFilter)
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts, query, statusFilter]);

  const selected = selectedId ? contacts.find((c) => c.id === selectedId) || null : null;

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }
  function openEdit(c: Client) {
    setEditingId(c.id);
    setForm(toForm(c));
    setFormError(null);
    setModalOpen(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = fromForm(form);
    const result = editingId
      ? await applyMutation(() => api(`/api/adora-agenda/clients/${editingId}`, "PATCH", payload))
      : await applyMutation(() => api("/api/adora-agenda/clients", "POST", payload));
    setSaving(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setModalOpen(false);
  }

  async function deleteContact(id: string) {
    if (!confirm("¿Eliminar este contacto? También se pierde su historial de actividades y tareas asociadas.")) return;
    const result = await applyMutation(() => api(`/api/adora-agenda/clients/${id}`, "DELETE"));
    if (result.ok && selectedId === id) setSelectedId(null);
  }

  async function convertToClient(c: Client) {
    await applyMutation(() =>
      api(`/api/adora-agenda/clients/${c.id}`, "PATCH", { ...fromForm(toForm(c)), status: "cliente" }),
    );
  }

  return (
    <>
      <div className="card">
        <div className="filters-row">
          <input
            className="field-search"
            placeholder="Buscar por nombre, teléfono, correo o empresa…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="seg-tabs">
            {(["todos", "prospecto", "cliente", "inactivo"] as const).map((s) => (
              <button
                key={s}
                className={`seg-tab ${statusFilter === s ? "active" : ""}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === "todos" ? "Todos" : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <button className="new-appt-btn" style={{ marginLeft: "auto" }} onClick={openCreate}>
            <span className="plus">+</span> Nuevo contacto
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-list">Sin contactos que coincidan.</div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Empresa</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th>Etiquetas</th>
                  <th>Responsable</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} onClick={() => setSelectedId(c.id)} className="data-row">
                    <td>
                      <span className="row-title">{c.name}</span>
                    </td>
                    <td>{c.company || "—"}</td>
                    <td>{c.phone || "—"}</td>
                    <td>
                      <span className={`badge badge-${c.status}`}>{STATUS_LABEL[c.status]}</span>
                    </td>
                    <td>
                      <div className="tag-row">
                        {c.tags.slice(0, 3).map((t) => (
                          <span className="tag-chip" key={t}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{ownerById.get(c.ownerId)?.name || "Sin asignar"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={`overlay ${modalOpen ? "open" : ""}`} onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
        <div className="modal">
          <h2>{editingId ? "Editar contacto" : "Nuevo contacto"}</h2>
          <form onSubmit={submitForm}>
            {formError && <div className="login-error">{formError}</div>}
            <div className="field">
              <label htmlFor="ctName">Nombre</label>
              <input id="ctName" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
            </div>
            <div className="row2">
              <div className="field">
                <label htmlFor="ctPhone">Teléfono</label>
                <input id="ctPhone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="field">
                <label htmlFor="ctEmail">Correo</label>
                <input id="ctEmail" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="row2">
              <div className="field">
                <label htmlFor="ctCompany">Empresa</label>
                <input id="ctCompany" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
              </div>
              <div className="field">
                <label htmlFor="ctLocation">Ubicación</label>
                <input id="ctLocation" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
              </div>
            </div>
            <div className="row2">
              <div className="field">
                <label htmlFor="ctSource">Origen</label>
                <input
                  id="ctSource"
                  placeholder="Instagram, referido…"
                  value={form.source}
                  onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="ctStatus">Estado</label>
                <select
                  id="ctStatus"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ContactStatus }))}
                >
                  <option value="prospecto">Prospecto</option>
                  <option value="cliente">Cliente</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="ctTags">Etiquetas (separadas por coma)</label>
              <input
                id="ctTags"
                placeholder={state.settings.tags.join(", ")}
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="ctOwner">Responsable</label>
              <select id="ctOwner" value={form.ownerId} onChange={(e) => setForm((f) => ({ ...f, ownerId: e.target.value }))}>
                <option value="">Sin asignar</option>
                {state.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="ctNotes">Notas</label>
              <textarea id="ctNotes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="modal-actions">
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

      <div className={`drawer-overlay ${selected ? "open" : ""}`} onClick={(e) => e.target === e.currentTarget && setSelectedId(null)}>
        {selected && (
          <ContactDrawer
            contact={selected}
            state={state}
            applyMutation={applyMutation}
            onClose={() => setSelectedId(null)}
            onEdit={() => openEdit(selected)}
            onDelete={() => deleteContact(selected.id)}
            onConvert={() => convertToClient(selected)}
          />
        )}
      </div>
    </>
  );
}

function ContactDrawer({
  contact,
  state,
  applyMutation,
  onClose,
  onEdit,
  onDelete,
  onConvert,
}: {
  contact: Client;
  state: ClientAgendaState;
  applyMutation: ReturnType<typeof useCrmState>["applyMutation"];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConvert: () => void;
}) {
  const appointments = state.appointments
    .filter((a) => a.clientId === contact.id)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const activities = state.activities
    .filter((a) => a.contactId === contact.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const tasks = state.tasks.filter((t) => t.contactId === contact.id);
  const opportunities = state.opportunities.filter((o) => o.contactId === contact.id);
  const userById = new Map(state.users.map((u) => [u.id, u]));
  const serviceById = new Map(state.services.map((s) => [s.id, s]));

  const [actType, setActType] = useState<string>(state.settings.activityTypes[0]?.id || "nota");
  const [actSubject, setActSubject] = useState("");
  const [savingAct, setSavingAct] = useState(false);

  async function addActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!actSubject.trim()) return;
    setSavingAct(true);
    await applyMutation(() =>
      api("/api/adora-agenda/activities", "POST", { type: actType, contactId: contact.id, subject: actSubject.trim() }),
    );
    setSavingAct(false);
    setActSubject("");
  }

  return (
    <div className="drawer">
      <div className="drawer-head">
        <div>
          <h2>{contact.name}</h2>
          <span className={`badge badge-${contact.status}`}>{STATUS_LABEL[contact.status]}</span>
        </div>
        <button className="icon-btn" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="drawer-actions">
        <button className="btn-ghost" onClick={onEdit}>
          Editar
        </button>
        {contact.status === "prospecto" && (
          <button className="btn-primary" onClick={onConvert}>
            Convertir a cliente
          </button>
        )}
        <button className="btn-danger" onClick={onDelete}>
          Eliminar
        </button>
      </div>

      <div className="drawer-section">
        <div className="row-sub">{contact.phone || "Sin teléfono"}</div>
        <div className="row-sub">{contact.email || "Sin correo"}</div>
        {contact.company && <div className="row-sub">{contact.company}</div>}
        {contact.location && <div className="row-sub">{contact.location}</div>}
        {contact.source && <div className="row-sub">Origen: {contact.source}</div>}
        {contact.tags.length > 0 && (
          <div className="tag-row" style={{ marginTop: 6 }}>
            {contact.tags.map((t) => (
              <span className="tag-chip" key={t}>
                {t}
              </span>
            ))}
          </div>
        )}
        {contact.notes && <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 8 }}>{contact.notes}</p>}
      </div>

      <div className="drawer-section">
        <div className="mini-cal-head">
          <h3>Oportunidades ({opportunities.length})</h3>
          <Link href={`/oportunidades?contactId=${contact.id}`} className="row-sub">
            + Nueva
          </Link>
        </div>
        {opportunities.length === 0 && <div className="empty-list">Sin oportunidades.</div>}
        {opportunities.map((o) => (
          <div className="list-row-btn" key={o.id} style={{ cursor: "default" }}>
            <span className="service-row-text">
              <span className="row-title">{o.title}</span>
              <span className="row-sub">
                {formatColones(o.value)} · {o.stage}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="drawer-section">
        <h3>Citas ({appointments.length})</h3>
        {appointments.length === 0 && <div className="empty-list">Sin citas.</div>}
        {appointments.slice(0, 8).map((a) => (
          <div className="list-row-btn" key={a.id} style={{ cursor: "default" }}>
            <span className="service-row-text">
              <span className="row-title">{serviceById.get(a.service)?.label || a.service}</span>
              <span className="row-sub">
                {formatDateEs(a.date)} · {a.time}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="drawer-section">
        <h3>Tareas ({tasks.filter((t) => t.status !== "completada").length} pendiente{tasks.filter((t) => t.status !== "completada").length === 1 ? "" : "s"})</h3>
        {tasks.length === 0 && <div className="empty-list">Sin tareas.</div>}
        {tasks.map((t) => (
          <div className="list-row-btn" key={t.id} style={{ cursor: "default" }}>
            <span className="service-row-text">
              <span className="row-title">{t.title}</span>
              <span className="row-sub">
                {t.status} {t.dueDate ? `· vence ${formatDateEs(t.dueDate)}` : ""}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="drawer-section">
        <h3>Línea de tiempo</h3>
        <form onSubmit={addActivity} className="inline-activity-form">
          <select value={actType} onChange={(e) => setActType(e.target.value)}>
            {state.settings.activityTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            placeholder="¿Qué pasó?"
            value={actSubject}
            onChange={(e) => setActSubject(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={savingAct}>
            +
          </button>
        </form>
        {activities.length === 0 && <div className="empty-list">Sin actividad registrada.</div>}
        {activities.map((act) => (
          <div className="timeline-row" key={act.id}>
            <span className="timeline-icon">•</span>
            <span className="service-row-text">
              <span className="row-title">{act.subject}</span>
              <span className="row-sub">
                {userById.get(act.ownerId)?.name || ""} · {formatDateEs(act.createdAt.slice(0, 10))}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
