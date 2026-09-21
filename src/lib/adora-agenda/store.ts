import { Redis } from "@upstash/redis";
import { hashPassword } from "./auth";
import { INTERNAL_CLIENT_ID } from "./types";
import type {
  AgendaState,
  Client,
  Appointment,
  StaffMember,
  ServiceType,
  Opportunity,
  Activity,
  CrmTask,
  CrmUser,
  CrmSettings,
} from "./types";

const STATE_KEY = "adora-agenda:state:v1";
export { INTERNAL_CLIENT_ID };

export function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function client(id: string, name: string, phone: string, notes = ""): Client {
  const now = new Date().toISOString();
  return {
    id,
    name,
    phone,
    email: "",
    notes,
    company: "",
    location: "",
    source: "",
    status: "cliente",
    tags: [],
    ownerId: "",
    createdAt: now,
    updatedAt: now,
    createdBy: "",
    updatedBy: "",
  };
}

// Clientas reales de la semana (de la agenda de Google Calendar de Adora).
// Sin teléfono/notas inventados — se completan desde la agenda real. Todas
// arrancan como "cliente" (ya tienen citas reales) y sin responsable
// asignado — eso se define desde Contactos.
const SEED_CLIENTS: Client[] = [
  client("cli-karina-guadamuz", "Karina Guadamuz", ""),
  client("cli-catalina-saez", "Catalina Saez", ""),
  client("cli-mami", "Mami", ""),
  client("cli-mari-muniz", "Mari Muñiz", ""),
  client("cli-daniela-reyes", "Daniela Reyes", ""),
  client("cli-mariel-calvo", "Mariel Calvo", ""),
  client("cli-jimena-ovideo", "Jimena Ovideo", ""),
  client("cli-cristina-solano", "Cristina Solano", ""),
  client("cli-alessia-carvajal", "Alessia Carvajal", ""),
  client("cli-elena-murillo", "Elena Murillo", ""),
  client("cli-valeria-garcia", "Valeria Garcia", ""),
  client("cli-majo-salinas", "Majo Salinas", ""),
  client("cli-winny-ramirez", "Winny Ramirez", ""),
  client("cli-fransey-duran", "Fransey Duran", ""),
  client("cli-nicole-araya", "Nicole Araya", ""),
  // No es una clienta: representa horarios bloqueados (almuerzo, feriados).
  { ...client(INTERNAL_CLIENT_ID, "— Bloqueo interno —", ""), status: "inactivo" },
  // Contacto de ejemplo, claramente marcado como demo — para que el pipeline
  // de Oportunidades y la línea de tiempo de Actividades no se vean vacíos
  // antes de cargar datos reales. Fácil de borrar desde Contactos.
  { ...client("cli-demo-prospecto", "[DEMO] Prospecto de ejemplo", "8888-0000"), status: "prospecto", source: "Instagram", tags: ["Nuevo"] },
];

// Precios y servicios reales de Adora (guía visual de marca). Un color por
// categoría, no por servicio individual — con 22 servicios, un color cada
// uno haría la grilla ilegible; agrupados por categoría se lee de un vistazo.
const CAT_PEDICURE = "Pedicure";
const CAT_MANICURE = "Manicure";
const CAT_CEJAS = "Cejas y Pestañas";
const CAT_INTERNO = "Interno";
const COLOR_PEDICURE = "#8A4D57"; // rosa vino
const COLOR_MANICURE = "#C98999"; // rosa mauve
const COLOR_CEJAS = "#B98A54"; // dorado cálido, tercer acento de la familia
const COLOR_INTERNO = "#9B8B85"; // gris neutro — bloqueos, no servicios cobrables

function svc(id: string, label: string, category: string, price: number, color: string): ServiceType {
  return { id, label, category, price, color };
}

const SEED_SERVICES: ServiceType[] = [
  // Pedicure
  svc("ped-esmaltado", "Esmaltado semipermanente", CAT_PEDICURE, 12000, COLOR_PEDICURE),
  svc("ped-seco", "Pedi en seco", CAT_PEDICURE, 18000, COLOR_PEDICURE),
  svc("ped-jelly", "Jelly Spa", CAT_PEDICURE, 25000, COLOR_PEDICURE),
  svc("ped-spa", "Pedi Spa", CAT_PEDICURE, 22000, COLOR_PEDICURE),
  svc("ped-retiro", "Retiro de otro salón (pedicure)", CAT_PEDICURE, 3500, COLOR_PEDICURE),
  // Manicure
  svc("man-builder-sencillo", "Builder Gel diseño sencillo", CAT_MANICURE, 18000, COLOR_MANICURE),
  svc("man-builder-basico", "Builder Gel diseño básico", CAT_MANICURE, 20000, COLOR_MANICURE),
  svc("man-builder-elaborado", "Builder Gel diseño elaborado", CAT_MANICURE, 22000, COLOR_MANICURE),
  svc("man-gelx-elaborado", "Gel X diseño elaborado", CAT_MANICURE, 24000, COLOR_MANICURE),
  svc("man-gelx-basico", "Gel X diseño básico", CAT_MANICURE, 22000, COLOR_MANICURE),
  svc("man-gelx-sencillo", "Gel X sencillo", CAT_MANICURE, 20000, COLOR_MANICURE),
  svc("man-polygel", "Polygel", CAT_MANICURE, 22000, COLOR_MANICURE),
  svc("man-luminary-sencillo", "Luminary diseño sencillo", CAT_MANICURE, 17000, COLOR_MANICURE),
  svc("man-luminary-basico", "Luminary diseño básico", CAT_MANICURE, 19000, COLOR_MANICURE),
  svc("man-luminary-elaborado", "Luminary diseño elaborado", CAT_MANICURE, 21000, COLOR_MANICURE),
  svc("man-spa", "Manicure Spa", CAT_MANICURE, 10000, COLOR_MANICURE),
  svc("man-retiro", "Retiro de otro salón (manicure)", CAT_MANICURE, 3500, COLOR_MANICURE),
  // Cejas y pestañas
  svc("cej-bigote", "Depilación de bigote", CAT_CEJAS, 5000, COLOR_CEJAS),
  svc("cej-cejas", "Depilación de cejas", CAT_CEJAS, 12000, COLOR_CEJAS),
  svc("cej-lifting", "Lifting de cejas (+ diseño + tinte + depilación)", CAT_CEJAS, 18000, COLOR_CEJAS),
  svc("pes-lifting", "Lifting de pestañas", CAT_CEJAS, 25000, COLOR_CEJAS),
  svc("pes-lifting-koreano", "Lifting de pestañas koreano", CAT_CEJAS, 28000, COLOR_CEJAS),
  // Interno: bloquea horario en la grilla, no es un servicio cobrable
  svc("int-almuerzo", "Almuerzo", CAT_INTERNO, 0, COLOR_INTERNO),
  svc("int-feriado", "Día libre / feriado", CAT_INTERNO, 0, COLOR_INTERNO),
];

const SEED_STAFF: StaffMember[] = [
  { id: "staff-camila", name: "Camila", role: "manicurista", initials: "CA", photoUrl: "" },
  { id: "staff-rocio", name: "Rocio", role: "nail art", initials: "RG", photoUrl: "" },
  { id: "staff-paula", name: "Paula", role: "spa & pedicura", initials: "PM", photoUrl: "" },
];

function appt(
  id: string,
  date: string,
  time: string,
  duration: number,
  clientId: string,
  service: string,
  notes = "",
): Appointment {
  return { id, date, time, duration, clientId, service, notes, opportunityId: "" };
}

// Semana real tomada de la agenda de Google Calendar de Adora. "Almuerzo" y
// el feriado usan la clienta sintética cli-interno — no son citas cobrables,
// son bloqueos de horario (hasta que haya una función dedicada para eso).
function seedAppointmentsForWeek(mondayIso: string): Appointment[] {
  const d = (offsetDays: number) => {
    const base = new Date(mondayIso + "T00:00:00");
    base.setDate(base.getDate() + offsetDays);
    return base.toISOString().slice(0, 10);
  };
  return [
    // Lunes
    appt("seed-lun-1", d(0), "09:00", 120, "cli-karina-guadamuz", "man-gelx-sencillo", "Gel X + retiro"),
    appt("seed-lun-almuerzo", d(0), "11:00", 60, INTERNAL_CLIENT_ID, "int-almuerzo"),
    appt("seed-lun-2", d(0), "12:00", 120, "cli-catalina-saez", "man-luminary-elaborado", "Semi en manos elaboradas"),
    appt("seed-lun-3", d(0), "14:00", 120, "cli-mami", "man-gelx-sencillo", "Gel X"),
    appt("seed-lun-4", d(0), "16:00", 120, "cli-mari-muniz", "man-luminary-basico", "Luminary"),
    // Martes — feriado
    appt("seed-mar-feriado", d(1), "09:00", 480, INTERNAL_CLIENT_ID, "int-feriado", "Día de la Independencia"),
    // Miércoles
    appt("seed-mie-1", d(2), "09:00", 120, "cli-daniela-reyes", "man-builder-basico", "Builder"),
    appt("seed-mie-2", d(2), "10:00", 90, "cli-mariel-calvo", "man-builder-basico"),
    appt("seed-mie-almuerzo", d(2), "11:30", 60, INTERNAL_CLIENT_ID, "int-almuerzo"),
    appt("seed-mie-3", d(2), "13:00", 90, "cli-jimena-ovideo", "man-gelx-sencillo", "Gel X Sencillo"),
    // Jueves
    appt("seed-jue-1", d(3), "09:30", 120, "cli-cristina-solano", "man-luminary-basico", "Luminary"),
    appt("seed-jue-almuerzo", d(3), "11:30", 60, INTERNAL_CLIENT_ID, "int-almuerzo"),
    appt("seed-jue-2", d(3), "15:30", 120, "cli-alessia-carvajal", "man-gelx-sencillo", "Gel X"),
    appt("seed-jue-3", d(3), "17:00", 60, "cli-elena-murillo", "ped-esmaltado", "Pedicure"),
    // Viernes: sin citas
    // Sábado
    appt("seed-sab-1", d(5), "09:00", 120, "cli-valeria-garcia", "man-luminary-basico", "Luminary"),
    appt("seed-sab-2", d(5), "11:00", 90, "cli-majo-salinas", "man-gelx-sencillo", "Semi en manos"),
    appt("seed-sab-almuerzo", d(5), "12:30", 60, INTERNAL_CLIENT_ID, "int-almuerzo"),
    appt("seed-sab-3", d(5), "13:30", 90, "cli-winny-ramirez", "ped-jelly", "Pedi - Jelly Spa"),
    // Domingo
    appt("seed-dom-1", d(6), "09:00", 120, "cli-fransey-duran", "man-gelx-sencillo", "Gel X + Semi en pies"),
    appt("seed-dom-2", d(6), "11:00", 150, "cli-nicole-araya", "man-luminary-basico", "Luminary básico + Retiro + Semi en pies"),
    appt("seed-dom-almuerzo", d(6), "13:30", 60, INTERNAL_CLIENT_ID, "int-almuerzo"),
  ];
}

function mondayOfCurrentWeekIso(): string {
  const now = new Date();
  const day = now.getDay(); // 0 Sun .. 6 Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const d = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ---------- CRM: pipeline / tags / tipos (editables desde Configuración) ----------

export const DEFAULT_SETTINGS: CrmSettings = {
  pipelineStages: [
    { id: "nuevo", label: "Nuevo", isWon: false, isLost: false },
    { id: "contactado", label: "Contactado", isWon: false, isLost: false },
    { id: "calificado", label: "Calificado", isWon: false, isLost: false },
    { id: "propuesta", label: "Propuesta", isWon: false, isLost: false },
    { id: "negociacion", label: "Negociación", isWon: false, isLost: false },
    { id: "ganado", label: "Ganado", isWon: true, isLost: false },
    { id: "perdido", label: "Perdido", isWon: false, isLost: true },
  ],
  tags: ["VIP", "Frecuente", "Nuevo", "Instagram", "Referido"],
  activityTypes: [
    { id: "llamada", label: "Llamada" },
    { id: "reunion", label: "Reunión" },
    { id: "correo", label: "Correo" },
    { id: "mensaje", label: "Mensaje" },
    { id: "nota", label: "Nota" },
  ],
  taskPriorities: [
    { id: "baja", label: "Baja" },
    { id: "media", label: "Media" },
    { id: "alta", label: "Alta" },
  ],
};

// Oportunidad, actividad y tarea de ejemplo — todas colgando del contacto
// demo de arriba, nunca de una clienta real, para no inventar información
// comercial sobre personas reales. Bórralas cuando cargues datos reales.
function buildDemoOpportunities(): Opportunity[] {
  const now = new Date().toISOString();
  return [
    {
      id: "opp-demo-1",
      title: "[DEMO] Paquete mensual de manicure",
      contactId: "cli-demo-prospecto",
      ownerId: "",
      stage: "contactado",
      value: 60000,
      closeDate: "",
      probability: 40,
      lossReason: "",
      notes: "Ejemplo de oportunidad — edítala o bórrala.",
      createdAt: now,
      updatedAt: now,
      createdBy: "",
      updatedBy: "",
    },
  ];
}
function buildDemoActivities(): Activity[] {
  const now = new Date().toISOString();
  return [
    {
      id: "act-demo-1",
      type: "mensaje",
      contactId: "cli-demo-prospecto",
      opportunityId: "opp-demo-1",
      subject: "[DEMO] Escribió por Instagram preguntando precios",
      notes: "Ejemplo de actividad — edítala o bórrala.",
      ownerId: "",
      createdAt: now,
      createdBy: "",
    },
  ];
}
function buildDemoTasks(): CrmTask[] {
  const now = new Date().toISOString();
  return [
    {
      id: "task-demo-1",
      title: "[DEMO] Llamar para confirmar interés",
      contactId: "cli-demo-prospecto",
      opportunityId: "opp-demo-1",
      assigneeId: "",
      priority: "media",
      dueDate: "",
      status: "pendiente",
      notes: "Ejemplo de tarea — edítala o bórrala.",
      createdAt: now,
      updatedAt: now,
      createdBy: "",
      updatedBy: "",
    },
  ];
}

// Cuentas de ejemplo para el equipo — mismos nombres que en Personal, para
// que cada quien tenga usuario propio desde el primer día. Contraseña demo
// compartida: cámbienla desde Configuración → Usuarios apenas entren.
const DEMO_USER_PASSWORD = "Adora2026!";
async function buildSeedUsers(): Promise<CrmUser[]> {
  const now = new Date().toISOString();
  const hash = await hashPassword(DEMO_USER_PASSWORD);
  return [
    { id: "usr-paula", name: "Paula", username: "paula", passwordHash: hash, role: "supervisor", active: true, createdAt: now },
    { id: "usr-camila", name: "Camila", username: "camila", passwordHash: hash, role: "comercial", active: true, createdAt: now },
    { id: "usr-rocio", name: "Rocio", username: "rocio", passwordHash: hash, role: "comercial", active: true, createdAt: now },
  ];
}

async function buildSeedState(): Promise<AgendaState> {
  return {
    clients: SEED_CLIENTS,
    appointments: seedAppointmentsForWeek(mondayOfCurrentWeekIso()),
    staff: SEED_STAFF,
    services: SEED_SERVICES,
    opportunities: buildDemoOpportunities(),
    activities: buildDemoActivities(),
    tasks: buildDemoTasks(),
    users: await buildSeedUsers(),
    settings: DEFAULT_SETTINGS,
  };
}

// Todo estado leído de Redis pasa por acá — así una base ya sembrada con el
// esquema viejo (solo agenda, sin CRM) se completa con arreglos y campos
// nuevos en vez de romper cualquier página que espere que existan.
function normalizeState(raw: Partial<AgendaState> | null | undefined): AgendaState {
  const clients: Client[] = (raw?.clients || []).map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    notes: c.notes,
    company: c.company ?? "",
    location: c.location ?? "",
    source: c.source ?? "",
    status: c.status ?? "cliente",
    tags: c.tags ?? [],
    ownerId: c.ownerId ?? "",
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    createdBy: c.createdBy ?? "",
    updatedBy: c.updatedBy ?? "",
  }));
  const appointments: Appointment[] = (raw?.appointments || []).map((a) => ({
    id: a.id,
    date: a.date,
    time: a.time,
    duration: a.duration,
    clientId: a.clientId,
    service: a.service,
    notes: a.notes,
    opportunityId: a.opportunityId ?? "",
  }));
  return {
    clients,
    appointments,
    staff: raw?.staff || [],
    services: raw?.services || [],
    opportunities: raw?.opportunities || [],
    activities: raw?.activities || [],
    tasks: raw?.tasks || [],
    users: raw?.users || [],
    settings: raw?.settings
      ? {
          pipelineStages: raw.settings.pipelineStages?.length ? raw.settings.pipelineStages : DEFAULT_SETTINGS.pipelineStages,
          tags: raw.settings.tags || DEFAULT_SETTINGS.tags,
          activityTypes: raw.settings.activityTypes?.length ? raw.settings.activityTypes : DEFAULT_SETTINGS.activityTypes,
          taskPriorities: raw.settings.taskPriorities?.length ? raw.settings.taskPriorities : DEFAULT_SETTINGS.taskPriorities,
        }
      : DEFAULT_SETTINGS,
  };
}

// Vercel's own KV product is deprecated in favor of the Upstash Redis
// integration (Vercel Marketplace). Different integration versions expose
// either naming, so both are accepted.
function redisUrl(): string | undefined {
  return process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
}
function redisToken(): string | undefined {
  return process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
}

export class KvNotConfiguredError extends Error {
  constructor() {
    super(
      "No hay un Redis conectado a este proyecto de Vercel: instala la integración de Redis (Vercel → Storage → Marketplace) y agrega las variables UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN.",
    );
    this.name = "KvNotConfiguredError";
  }
}

let cachedClient: Redis | null = null;
function getClient(): Redis {
  const url = redisUrl();
  const token = redisToken();
  if (!url || !token) throw new KvNotConfiguredError();
  if (!cachedClient) cachedClient = new Redis({ url, token });
  return cachedClient;
}

export async function getState(): Promise<AgendaState> {
  const redis = getClient();
  const state = await redis.get<Partial<AgendaState>>(STATE_KEY);
  if (!state) {
    const seeded = await buildSeedState();
    await redis.set(STATE_KEY, seeded);
    return seeded;
  }
  return normalizeState(state);
}

export async function setState(state: AgendaState): Promise<void> {
  const redis = getClient();
  await redis.set(STATE_KEY, state);
}
