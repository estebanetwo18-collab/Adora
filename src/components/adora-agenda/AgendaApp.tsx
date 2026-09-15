"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AgendaState, Appointment, Client, ServiceType, StaffMember } from "@/lib/adora-agenda/types";

const DOW = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
const START_HOUR = 9;
const END_HOUR = 19;
const ROW_H = 64;
const POLL_MS = 8000;

// ---------- date helpers (local time — this is a real, ongoing salon calendar) ----------
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + n);
  return r;
}
function mondayOf(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), diff);
}
function formatRangeLabel(weekStart: Date): string {
  const d0 = weekStart;
  const d5 = addDays(weekStart, 5);
  const y = d5.getFullYear();
  if (d0.getMonth() === d5.getMonth()) {
    return `${d0.getDate()}–${d5.getDate()} ${MONTHS_ES[d5.getMonth()]} ${y}`;
  }
  return `${d0.getDate()} ${MONTHS_ES[d0.getMonth()]} – ${d5.getDate()} ${MONTHS_ES[d5.getMonth()]} ${y}`;
}
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${pad2(h)}:${pad2(mm)}`;
}
function cellForDate(key: string): { dayIndex: number; weekStart: Date } {
  const d = parseDateKey(key);
  const ws = mondayOf(d);
  const dayIndex = Math.round((d.getTime() - ws.getTime()) / 86400000);
  return { dayIndex: Math.min(Math.max(dayIndex, 0), 5), weekStart: ws };
}
function monthGridDays(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = mondayOf(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
const HOUR_OPTIONS = (() => {
  const opts: string[] = [];
  for (let m = START_HOUR * 60; m < END_HOUR * 60; m += 30) opts.push(minutesToTime(m));
  return opts;
})();
const DURATION_OPTIONS = [30, 60, 90, 120];
const FALLBACK_COLOR = "#9B8B85";

type SyncStatus = "loading" | "ready" | "saving" | "error";

async function api<T = { ok: true; state: AgendaState }>(
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

export function AgendaApp() {
  const [state, setState] = useState<AgendaState | null>(null);
  const [loadError, setLoadError] = useState<{ code?: string; message: string } | null>(null);
  const [sync, setSync] = useState<SyncStatus>("loading");
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(new Date()));
  const [today] = useState<Date>(() => new Date());
  const todayKey = dateKey(today);

  const [toast, setToast] = useState<{ msg: string; id: number } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast({ msg, id: Date.now() });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

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
    // Initial load on mount, then poll — the recommended pattern for
    // syncing with an external system (see the rule's own guidance).
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
    async (run: () => Promise<{ state: AgendaState }>, successMsg: string) => {
      setSync("saving");
      try {
        const result = await run();
        setState(result.state);
        setSync("ready");
        showToast(successMsg);
        return true;
      } catch (err) {
        setSync("ready");
        const message = err instanceof Error ? err.message : "No se pudo guardar.";
        showToast(message);
        return false;
      }
    },
    [showToast],
  );

  // ---------- appointment modal ----------
  const [apptOpen, setApptOpen] = useState(false);
  const [editingApptId, setEditingApptId] = useState<string | null>(null);
  const [apptDayIdx, setApptDayIdx] = useState(0);
  const [apptTime, setApptTime] = useState(HOUR_OPTIONS[1]);
  const [apptDuration, setApptDuration] = useState(60);
  const [apptService, setApptService] = useState("");
  const [apptNotes, setApptNotes] = useState("");
  const [confirmedClient, setConfirmedClient] = useState<Client | null>(null);
  const [clientQuery, setClientQuery] = useState("");
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientNotes, setNewClientNotes] = useState("");
  const clientNameRef = useRef<HTMLInputElement>(null);

  const clientMatches = useMemo(() => {
    if (!state || !clientQuery.trim()) return [];
    const q = clientQuery.trim().toLowerCase();
    return state.clients.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6);
  }, [state, clientQuery]);

  function openApptModal(appt?: Appointment) {
    if (!state) return;
    setEditingApptId(appt ? appt.id : null);
    if (appt) {
      const cell = cellForDate(appt.date);
      setWeekStart(cell.weekStart);
      setApptDayIdx(cell.dayIndex);
      setApptTime(appt.time);
      setApptDuration(appt.duration);
      setApptService(appt.service);
      setApptNotes(appt.notes || "");
      const c = state.clients.find((cl) => cl.id === appt.clientId) || null;
      setConfirmedClient(c);
      setClientQuery(c ? c.name : "");
    } else {
      setApptDayIdx(0);
      setApptTime(HOUR_OPTIONS[1]);
      setApptDuration(60);
      setApptService(state.services[0]?.id || "");
      setApptNotes("");
      setConfirmedClient(null);
      setClientQuery("");
    }
    setNewClientPhone("");
    setNewClientNotes("");
    setClientPickerOpen(false);
    setApptOpen(true);
  }
  function closeApptModal() {
    setApptOpen(false);
    setEditingApptId(null);
    setClientPickerOpen(false);
  }

  async function saveAppointment() {
    if (!state) return;
    const name = clientQuery.trim();
    if (!name) {
      clientNameRef.current?.focus();
      return;
    }
    if (!apptService) {
      showToast("Elige un servicio.");
      return;
    }
    const day = addDays(weekStart, apptDayIdx);
    const date = dateKey(day);

    let clientId = confirmedClient?.id || "";
    if (!clientId) {
      setSync("saving");
      try {
        const created = await api<{ ok: true; state: AgendaState; client: Client }>(
          "/api/adora-agenda/clients",
          "POST",
          { name, phone: newClientPhone.trim(), notes: newClientNotes.trim() },
        );
        clientId = created.client.id;
        setState(created.state);
      } catch (err) {
        setSync("ready");
        showToast(err instanceof Error ? err.message : "No se pudo crear la clienta.");
        return;
      }
    }

    const payload = { date, time: apptTime, duration: apptDuration, clientId, service: apptService, notes: apptNotes.trim() };
    const wasEditing = Boolean(editingApptId);
    const ok = await applyMutation(
      () =>
        editingApptId
          ? api(`/api/adora-agenda/appointments/${editingApptId}`, "PATCH", payload)
          : api("/api/adora-agenda/appointments", "POST", payload),
      wasEditing ? `Cita actualizada · ${DOW[apptDayIdx]} ${apptTime}` : `Cita agendada para ${name} · ${DOW[apptDayIdx]} ${apptTime}`,
    );
    if (ok) closeApptModal();
  }

  async function deleteAppointment() {
    if (!editingApptId) return;
    const ok = await applyMutation(
      () => api(`/api/adora-agenda/appointments/${editingApptId}`, "DELETE"),
      "Cita eliminada",
    );
    if (ok) closeApptModal();
  }

  // ---------- staff modal ----------
  const [staffOpen, setStaffOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [sfName, setSfName] = useState("");
  const [sfRole, setSfRole] = useState("");
  const [sfInitials, setSfInitials] = useState("");

  function openStaffModal(s?: StaffMember) {
    setEditingStaffId(s ? s.id : null);
    setSfName(s ? s.name : "");
    setSfRole(s ? s.role : "");
    setSfInitials(s ? s.initials : "");
    setStaffOpen(true);
  }
  function closeStaffModal() {
    setStaffOpen(false);
    setEditingStaffId(null);
  }
  async function saveStaff() {
    if (!sfName.trim()) return;
    const payload = { name: sfName.trim(), role: sfRole.trim(), initials: sfInitials.trim() };
    const wasEditing = Boolean(editingStaffId);
    const ok = await applyMutation(
      () =>
        editingStaffId
          ? api(`/api/adora-agenda/staff/${editingStaffId}`, "PATCH", payload)
          : api("/api/adora-agenda/staff", "POST", payload),
      wasEditing ? "Integrante actualizada" : "Integrante agregada",
    );
    if (ok) closeStaffModal();
  }
  async function deleteStaff() {
    if (!editingStaffId) return;
    const ok = await applyMutation(() => api(`/api/adora-agenda/staff/${editingStaffId}`, "DELETE"), "Integrante eliminada");
    if (ok) closeStaffModal();
  }

  // ---------- service modal ----------
  const [serviceOpen, setServiceOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [svLabel, setSvLabel] = useState("");
  const [svColor, setSvColor] = useState("#C1527A");

  function openServiceModal(s?: ServiceType) {
    setEditingServiceId(s ? s.id : null);
    setSvLabel(s ? s.label : "");
    setSvColor(s ? s.color : "#C1527A");
    setServiceOpen(true);
  }
  function closeServiceModal() {
    setServiceOpen(false);
    setEditingServiceId(null);
  }
  async function saveService() {
    if (!svLabel.trim()) return;
    const payload = { label: svLabel.trim(), color: svColor };
    const wasEditing = Boolean(editingServiceId);
    const ok = await applyMutation(
      () =>
        editingServiceId
          ? api(`/api/adora-agenda/services/${editingServiceId}`, "PATCH", payload)
          : api("/api/adora-agenda/services", "POST", payload),
      wasEditing ? "Servicio actualizado" : "Servicio agregado",
    );
    if (ok) closeServiceModal();
  }
  async function deleteService() {
    if (!editingServiceId) return;
    const ok = await applyMutation(() => api(`/api/adora-agenda/services/${editingServiceId}`, "DELETE"), "Servicio eliminado");
    if (ok) closeServiceModal();
  }

  // ---------- client profile modal ----------
  const [clientOpen, setClientOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [cfName, setCfName] = useState("");
  const [cfPhone, setCfPhone] = useState("");
  const [cfEmail, setCfEmail] = useState("");
  const [cfNotes, setCfNotes] = useState("");
  const [clientFilter, setClientFilter] = useState("");

  function openClientModal(c?: Client) {
    setEditingClientId(c ? c.id : null);
    setCfName(c ? c.name : "");
    setCfPhone(c ? c.phone : "");
    setCfEmail(c ? c.email : "");
    setCfNotes(c ? c.notes : "");
    setClientOpen(true);
  }
  function closeClientModal() {
    setClientOpen(false);
    setEditingClientId(null);
  }
  async function saveClientProfile() {
    if (!cfName.trim()) return;
    const payload = { name: cfName.trim(), phone: cfPhone.trim(), email: cfEmail.trim(), notes: cfNotes.trim() };
    const wasEditing = Boolean(editingClientId);
    const ok = await applyMutation(
      () =>
        editingClientId
          ? api(`/api/adora-agenda/clients/${editingClientId}`, "PATCH", payload)
          : api("/api/adora-agenda/clients", "POST", payload),
      wasEditing ? "Perfil de clienta guardado" : "Clienta agregada",
    );
    if (ok) closeClientModal();
  }
  async function deleteClientProfile() {
    if (!editingClientId) return;
    const ok = await applyMutation(
      () => api(`/api/adora-agenda/clients/${editingClientId}`, "DELETE"),
      "Clienta eliminada",
    );
    if (ok) closeClientModal();
  }

  // ---------- derived view data ----------
  const grouped = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    if (!state) return map;
    for (const a of state.appointments) {
      (map[a.date] ||= []).push(a);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.time.localeCompare(b.time));
    }
    return map;
  }, [state]);

  const serviceById = useMemo(() => {
    const m = new Map<string, ServiceType>();
    state?.services.forEach((s) => m.set(s.id, s));
    return m;
  }, [state]);

  const clientById = useMemo(() => {
    const m = new Map<string, Client>();
    state?.clients.forEach((c) => m.set(c.id, c));
    return m;
  }, [state]);

  const clientAppointmentHistory = useMemo(() => {
    if (!state || !editingClientId) return [];
    return state.appointments
      .filter((a) => a.clientId === editingClientId)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [state, editingClientId]);

  const visibleClients = useMemo(() => {
    if (!state) return [];
    const q = clientFilter.trim().toLowerCase();
    const list = q ? state.clients.filter((c) => c.name.toLowerCase().includes(q)) : state.clients;
    return [...list].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 40);
  }, [state, clientFilter]);

  const miniDays = useMemo(() => monthGridDays(weekStart), [weekStart]);
  const monthLabel = `${weekStart.toLocaleDateString("es-CR", { month: "long" })} ${weekStart.getFullYear()}`;

  // ---------- loading / error states ----------
  if (loadError) {
    return (
      <div className="app">
        <div className="card" style={{ maxWidth: 520, margin: "60px auto" }}>
          <h3 style={{ marginBottom: 10 }}>No se pudo cargar la agenda</h3>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 14 }}>{loadError.message}</p>
          <button className="btn-primary" onClick={() => fetchState()}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }
  if (!state) {
    return (
      <div className="app">
        <div className="loading-state">Cargando agenda…</div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div className="brand-text">
            <span className="name">Adora</span>
            <span className="sub">Agenda · Nail Salon</span>
          </div>
        </div>
        <div className="nav-group">
          <button className="today-btn" onClick={() => setWeekStart(mondayOf(new Date()))}>
            Hoy
          </button>
          <button className="icon-btn" aria-label="Semana anterior" onClick={() => setWeekStart((w) => addDays(w, -7))}>
            ‹
          </button>
          <button className="icon-btn" aria-label="Semana siguiente" onClick={() => setWeekStart((w) => addDays(w, 7))}>
            ›
          </button>
          <span className="range-label">{formatRangeLabel(weekStart)}</span>
        </div>
        <div className="view-tabs">
          <button className="view-tab active">Semana</button>
          <button className="view-tab" onClick={() => showToast("Vista disponible próximamente")}>
            Día
          </button>
          <button className="view-tab" onClick={() => showToast("Vista disponible próximamente")}>
            Mes
          </button>
        </div>
        <div className={`sync-pill ${sync === "saving" ? "connecting" : sync === "error" ? "offline" : ""}`}>
          <span className="sync-dot" />
          <span>{sync === "saving" ? "Guardando…" : sync === "error" ? "Sin conexión" : "Conectado"}</span>
        </div>
      </div>

      <div className="body">
        <div className="sidebar">
          <button className="new-appt-btn" onClick={() => openApptModal()}>
            <span className="plus">+</span> Nueva cita
          </button>

          <div className="card">
            <div className="mini-cal-head">
              <h3 style={{ textTransform: "capitalize" }}>{monthLabel}</h3>
            </div>
            <div className="mini-grid">
              {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                <div className="mini-dow" key={d}>
                  {d}
                </div>
              ))}
              {miniDays.map((d) => {
                const key = dateKey(d);
                const out = d.getMonth() !== weekStart.getMonth();
                const hasAppt = !out && (grouped[key]?.length ?? 0) > 0;
                const isToday = !out && key === todayKey;
                return (
                  <div
                    key={key}
                    className={`mini-day ${out ? "out" : ""} ${hasAppt ? "has-appt" : ""} ${isToday ? "today" : ""}`}
                    role="button"
                    tabIndex={-1}
                    onClick={() => !out && setWeekStart(mondayOf(d))}
                    style={{ cursor: out ? "default" : "pointer" }}
                  >
                    {d.getDate()}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h3>Servicios</h3>
            {state.services.length === 0 && <div className="empty-list">Sin servicios todavía.</div>}
            {state.services.map((s) => (
              <button key={s.id} type="button" className="list-row-btn" onClick={() => openServiceModal(s)}>
                <span className="legend-dot" style={{ background: s.color }} />
                <span className="row-title">{s.label}</span>
              </button>
            ))}
            <button className="add-row-btn" onClick={() => openServiceModal()}>
              + Agregar servicio
            </button>
          </div>

          <div className="card">
            <h3>Equipo</h3>
            {state.staff.length === 0 && <div className="empty-list">Sin integrantes todavía.</div>}
            {state.staff.map((s) => (
              <button key={s.id} type="button" className="list-row-btn" onClick={() => openStaffModal(s)}>
                <span className="avatar">{(s.initials || "?").toUpperCase()}</span>
                <span>
                  <span className="row-title">{s.name}</span> · {s.role}
                </span>
              </button>
            ))}
            <button className="add-row-btn" onClick={() => openStaffModal()}>
              + Agregar integrante
            </button>
          </div>

          <div className="card">
            <h3>Clientas</h3>
            <input
              className="field-search"
              placeholder="Buscar clienta…"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              style={{
                width: "100%",
                marginBottom: 8,
                fontSize: 12.5,
                padding: "7px 9px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--surface-alt)",
                color: "var(--ink)",
                fontFamily: "var(--font-manrope)",
              }}
            />
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {visibleClients.length === 0 && <div className="empty-list">Sin resultados.</div>}
              {visibleClients.map((c) => (
                <button key={c.id} type="button" className="list-row-btn" onClick={() => openClientModal(c)}>
                  <span className="avatar">{c.name.slice(0, 2).toUpperCase()}</span>
                  <span>
                    <span className="row-title">{c.name}</span>
                    {c.phone && <span className="row-sub"> · {c.phone}</span>}
                  </span>
                </button>
              ))}
            </div>
            <button className="add-row-btn" onClick={() => openClientModal()}>
              + Agregar clienta
            </button>
          </div>
        </div>

        <div className="calendar">
          <div className="grid-scroll">
            <div className="grid-inner">
              <div className="day-header-row">
                <div />
                {Array.from({ length: 6 }, (_, i) => {
                  const d = addDays(weekStart, i);
                  const isToday = dateKey(d) === todayKey;
                  return (
                    <div key={i} className={`day-header ${isToday ? "is-today" : ""}`}>
                      <div className="dow">{DOW[i]}</div>
                      <div className="num">{d.getDate()}</div>
                    </div>
                  );
                })}
              </div>
              <div className="grid-body">
                <div className="time-col">
                  {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                    <div className="time-label" key={i}>
                      <span>{pad2(START_HOUR + i)}:00</span>
                    </div>
                  ))}
                </div>
                {Array.from({ length: 6 }, (_, i) => {
                  const d = addDays(weekStart, i);
                  const key = dateKey(d);
                  const isToday = key === todayKey;
                  const dayAppts = grouped[key] || [];
                  return (
                    <div key={i} className={`day-col ${isToday ? "is-today" : ""}`}>
                      {dayAppts.length === 0 && <div className="empty-state">Sin citas</div>}
                      {dayAppts.map((a) => {
                        const svc = serviceById.get(a.service);
                        const cl = clientById.get(a.clientId);
                        const start = timeToMinutes(a.time) - START_HOUR * 60;
                        const top = (start / 60) * ROW_H;
                        const height = (a.duration / 60) * ROW_H - 3;
                        const end = minutesToTime(timeToMinutes(a.time) + a.duration);
                        return (
                          <div
                            key={a.id}
                            className={`appt ${height < 40 ? "short" : ""}`}
                            style={{ top, height: Math.max(height, 20), ["--cat" as string]: svc?.color || FALLBACK_COLOR }}
                            onClick={() => openApptModal(a)}
                          >
                            <div className="client">{cl?.name || "Clienta eliminada"}</div>
                            <div className="service">{svc?.label || a.service}</div>
                            <div className="time">
                              {a.time}–{end}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- appointment modal ---------- */}
      <div className={`overlay ${apptOpen ? "open" : ""}`} onClick={(e) => e.target === e.currentTarget && closeApptModal()}>
        <div className="modal">
          <h2>{editingApptId ? "Editar cita" : "Nueva cita"}</h2>
          <div className="hint">Se agenda dentro del horario 9:00–19:00, Lunes a Sábado.</div>

          <div className="field">
            <label>Cliente</label>
            {confirmedClient ? (
              <div className="client-chip">
                <span>
                  <span className="name">{confirmedClient.name}</span>
                  {confirmedClient.phone && <span className="sub"> · {confirmedClient.phone}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmedClient(null);
                    setClientQuery("");
                    setTimeout(() => clientNameRef.current?.focus(), 0);
                  }}
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="client-picker">
                <input
                  ref={clientNameRef}
                  type="text"
                  placeholder="Buscar o escribir nombre nuevo"
                  value={clientQuery}
                  onChange={(e) => {
                    setClientQuery(e.target.value);
                    setClientPickerOpen(true);
                  }}
                  onFocus={() => setClientPickerOpen(true)}
                  onBlur={() => setTimeout(() => setClientPickerOpen(false), 150)}
                />
                {clientPickerOpen && clientQuery.trim() && (
                  <div className="client-picker-list">
                    {clientMatches.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="client-picker-item"
                        onMouseDown={() => {
                          setConfirmedClient(c);
                          setClientQuery(c.name);
                          setClientPickerOpen(false);
                        }}
                      >
                        <span>{c.name}</span>
                        {c.phone && <span className="sub">{c.phone}</span>}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="client-picker-item create"
                      onMouseDown={() => setClientPickerOpen(false)}
                    >
                      + Crear clienta &quot;{clientQuery.trim()}&quot;
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {!confirmedClient && clientQuery.trim() && (
            <div className="row2">
              <div className="field">
                <label>Teléfono (opcional)</label>
                <input type="text" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} />
              </div>
              <div className="field">
                <label>Nota (opcional)</label>
                <input type="text" value={newClientNotes} onChange={(e) => setNewClientNotes(e.target.value)} />
              </div>
            </div>
          )}

          <div className="row2">
            <div className="field">
              <label>Día</label>
              <select value={apptDayIdx} onChange={(e) => setApptDayIdx(Number(e.target.value))}>
                {Array.from({ length: 6 }, (_, i) => {
                  const d = addDays(weekStart, i);
                  return (
                    <option key={i} value={i}>
                      {DOW[i]} {d.getDate()} {MONTHS_ES[d.getMonth()]}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="field">
              <label>Servicio</label>
              <select value={apptService} onChange={(e) => setApptService(e.target.value)}>
                {state.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label>Hora</label>
              <select value={apptTime} onChange={(e) => setApptTime(e.target.value)}>
                {HOUR_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Duración</label>
              <select value={apptDuration} onChange={(e) => setApptDuration(Number(e.target.value))}>
                {DURATION_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m === 60 ? "1 h" : m === 120 ? "2 h" : m === 90 ? "1 h 30" : `${m} min`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Notas (opcional)</label>
            <textarea value={apptNotes} onChange={(e) => setApptNotes(e.target.value)} rows={2} />
          </div>

          <div className="modal-actions">
            {editingApptId && (
              <button className="btn-danger" onClick={deleteAppointment} disabled={sync === "saving"}>
                Eliminar
              </button>
            )}
            <button className="btn-ghost" onClick={closeApptModal}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={saveAppointment} disabled={sync === "saving"}>
              {editingApptId ? "Guardar cambios" : "Agendar"}
            </button>
          </div>
        </div>
      </div>

      {/* ---------- staff modal ---------- */}
      <div className={`overlay ${staffOpen ? "open" : ""}`} onClick={(e) => e.target === e.currentTarget && closeStaffModal()}>
        <div className="modal">
          <h2>{editingStaffId ? "Editar integrante" : "Nueva integrante"}</h2>
          <div className="hint">Así aparece en la tarjeta de equipo de la agenda.</div>
          <div className="field">
            <label>Nombre</label>
            <input type="text" value={sfName} onChange={(e) => setSfName(e.target.value)} />
          </div>
          <div className="row2">
            <div className="field">
              <label>Rol</label>
              <input type="text" placeholder="ej. manicurista" value={sfRole} onChange={(e) => setSfRole(e.target.value)} />
            </div>
            <div className="field">
              <label>Iniciales</label>
              <input type="text" maxLength={2} placeholder="ej. CA" value={sfInitials} onChange={(e) => setSfInitials(e.target.value)} />
            </div>
          </div>
          <div className="modal-actions">
            {editingStaffId && (
              <button className="btn-danger" onClick={deleteStaff} disabled={sync === "saving"}>
                Eliminar
              </button>
            )}
            <button className="btn-ghost" onClick={closeStaffModal}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={saveStaff} disabled={sync === "saving"}>
              {editingStaffId ? "Guardar cambios" : "Agregar"}
            </button>
          </div>
        </div>
      </div>

      {/* ---------- service modal ---------- */}
      <div className={`overlay ${serviceOpen ? "open" : ""}`} onClick={(e) => e.target === e.currentTarget && closeServiceModal()}>
        <div className="modal">
          <h2>{editingServiceId ? "Editar servicio" : "Nuevo servicio"}</h2>
          <div className="hint">El color se usa para identificarlo en la grilla y la leyenda.</div>
          <div className="row2">
            <div className="field">
              <label>Nombre</label>
              <input type="text" value={svLabel} onChange={(e) => setSvLabel(e.target.value)} />
            </div>
            <div className="field">
              <label>Color</label>
              <input type="color" value={svColor} onChange={(e) => setSvColor(e.target.value)} />
            </div>
          </div>
          <div className="modal-actions">
            {editingServiceId && (
              <button className="btn-danger" onClick={deleteService} disabled={sync === "saving"}>
                Eliminar
              </button>
            )}
            <button className="btn-ghost" onClick={closeServiceModal}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={saveService} disabled={sync === "saving"}>
              {editingServiceId ? "Guardar cambios" : "Agregar"}
            </button>
          </div>
        </div>
      </div>

      {/* ---------- client profile modal ---------- */}
      <div className={`overlay ${clientOpen ? "open" : ""}`} onClick={(e) => e.target === e.currentTarget && closeClientModal()}>
        <div className="modal">
          <h2>{editingClientId ? "Perfil de clienta" : "Nueva clienta"}</h2>
          <div className="hint">Su nombre, contacto y notas quedan guardados y se reutilizan en cada cita.</div>
          <div className="field">
            <label>Nombre</label>
            <input type="text" value={cfName} onChange={(e) => setCfName(e.target.value)} />
          </div>
          <div className="row2">
            <div className="field">
              <label>Teléfono</label>
              <input type="text" value={cfPhone} onChange={(e) => setCfPhone(e.target.value)} />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={cfEmail} onChange={(e) => setCfEmail(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Notas</label>
            <textarea value={cfNotes} onChange={(e) => setCfNotes(e.target.value)} rows={2} placeholder="Preferencias, alergias, etc." />
          </div>

          {editingClientId && (
            <div className="field">
              <label>Historial de citas</label>
              {clientAppointmentHistory.length === 0 ? (
                <div className="empty-list">Todavía no tiene citas registradas.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {clientAppointmentHistory.map((a) => {
                    const svc = serviceById.get(a.service);
                    return (
                      <div key={a.id} className="client-chip" style={{ justifyContent: "flex-start", gap: 10 }}>
                        <span className="legend-dot" style={{ background: svc?.color || FALLBACK_COLOR, flex: "none" }} />
                        <span style={{ fontSize: 12.5 }}>
                          {a.date} · {a.time} · {svc?.label || a.service}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="modal-actions">
            {editingClientId && (
              <button className="btn-danger" onClick={deleteClientProfile} disabled={sync === "saving"}>
                Eliminar
              </button>
            )}
            <button className="btn-ghost" onClick={closeClientModal}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={saveClientProfile} disabled={sync === "saving"}>
              {editingClientId ? "Guardar cambios" : "Agregar"}
            </button>
          </div>
        </div>
      </div>

      {toast && <div className={`toast ${toast ? "show" : ""}`}>{toast.msg}</div>}
    </div>
  );
}
