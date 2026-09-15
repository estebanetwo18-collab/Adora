import { Redis } from "@upstash/redis";
import type { AgendaState, Client, Appointment, StaffMember, ServiceType } from "./types";

const STATE_KEY = "adora-agenda:state:v1";

export function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function client(
  id: string,
  name: string,
  phone: string,
  notes = "",
): Client {
  const now = new Date().toISOString();
  return { id, name, phone, email: "", notes, createdAt: now, updatedAt: now };
}

// Clientas reales de la semana (de la agenda de Google Calendar de Adora).
// Sin teléfono/notas inventados — se completan desde la agenda real.
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
  client("cli-interno", "— Bloqueo interno —", ""),
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
  return { id, date, time, duration, clientId, service, notes };
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
    appt("seed-lun-almuerzo", d(0), "11:00", 60, "cli-interno", "int-almuerzo"),
    appt("seed-lun-2", d(0), "12:00", 120, "cli-catalina-saez", "man-luminary-elaborado", "Semi en manos elaboradas"),
    appt("seed-lun-3", d(0), "14:00", 120, "cli-mami", "man-gelx-sencillo", "Gel X"),
    appt("seed-lun-4", d(0), "16:00", 120, "cli-mari-muniz", "man-luminary-basico", "Luminary"),
    // Martes — feriado
    appt("seed-mar-feriado", d(1), "09:00", 480, "cli-interno", "int-feriado", "Día de la Independencia"),
    // Miércoles
    appt("seed-mie-1", d(2), "09:00", 120, "cli-daniela-reyes", "man-builder-basico", "Builder"),
    appt("seed-mie-2", d(2), "10:00", 90, "cli-mariel-calvo", "man-builder-basico"),
    appt("seed-mie-almuerzo", d(2), "11:30", 60, "cli-interno", "int-almuerzo"),
    appt("seed-mie-3", d(2), "13:00", 90, "cli-jimena-ovideo", "man-gelx-sencillo", "Gel X Sencillo"),
    // Jueves
    appt("seed-jue-1", d(3), "09:30", 120, "cli-cristina-solano", "man-luminary-basico", "Luminary"),
    appt("seed-jue-almuerzo", d(3), "11:30", 60, "cli-interno", "int-almuerzo"),
    appt("seed-jue-2", d(3), "15:30", 120, "cli-alessia-carvajal", "man-gelx-sencillo", "Gel X"),
    appt("seed-jue-3", d(3), "17:00", 60, "cli-elena-murillo", "ped-esmaltado", "Pedicure"),
    // Viernes: sin citas
    // Sábado
    appt("seed-sab-1", d(5), "09:00", 120, "cli-valeria-garcia", "man-luminary-basico", "Luminary"),
    appt("seed-sab-2", d(5), "11:00", 90, "cli-majo-salinas", "man-gelx-sencillo", "Semi en manos"),
    appt("seed-sab-almuerzo", d(5), "12:30", 60, "cli-interno", "int-almuerzo"),
    appt("seed-sab-3", d(5), "13:30", 90, "cli-winny-ramirez", "ped-jelly", "Pedi - Jelly Spa"),
    // Domingo
    appt("seed-dom-1", d(6), "09:00", 120, "cli-fransey-duran", "man-gelx-sencillo", "Gel X + Semi en pies"),
    appt("seed-dom-2", d(6), "11:00", 150, "cli-nicole-araya", "man-luminary-basico", "Luminary básico + Retiro + Semi en pies"),
    appt("seed-dom-almuerzo", d(6), "13:30", 60, "cli-interno", "int-almuerzo"),
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

function buildSeedState(): AgendaState {
  return {
    clients: SEED_CLIENTS,
    appointments: seedAppointmentsForWeek(mondayOfCurrentWeekIso()),
    staff: SEED_STAFF,
    services: SEED_SERVICES,
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
  const state = await redis.get<AgendaState>(STATE_KEY);
  if (!state) {
    const seeded = buildSeedState();
    await redis.set(STATE_KEY, seeded);
    return seeded;
  }
  return state;
}

export async function setState(state: AgendaState): Promise<void> {
  const redis = getClient();
  await redis.set(STATE_KEY, state);
}
