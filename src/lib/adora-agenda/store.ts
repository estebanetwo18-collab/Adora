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

const SEED_CLIENTS: Client[] = [
  client("cli-maria-fernanda", "María Fernanda", "8811-0234"),
  client("cli-camila-rojas", "Camila Rojas", "8822-1145"),
  client("cli-isabel-duarte", "Isabel Duarte", "8833-2256"),
  client("cli-valentina-cruz", "Valentina Cruz", "8844-3367"),
  client("cli-sofia-mendoza", "Sofía Mendoza", "8855-4478"),
  client("cli-renata-ibarra", "Renata Ibarra", "8866-5589"),
  client("cli-daniela-ponce", "Daniela Ponce", "8877-6690"),
  client("cli-lucia-herrera", "Lucía Herrera", "8888-7701"),
  client("cli-antonella-vidal", "Antonella Vidal", "8899-8812"),
  client("cli-constanza-ruiz", "Constanza Ruiz", "8811-9923"),
  client("cli-josefina-salas", "Josefina Salas", "8822-0134"),
  client("cli-trinidad-soto", "Trinidad Soto", "8833-1245"),
  client("cli-florencia-araya", "Florencia Araya", "8844-2356"),
  client("cli-martina-bravo", "Martina Bravo", "8855-3467"),
  client("cli-emilia-torres", "Emilia Torres", "8866-4578"),
  client("cli-catalina-munoz", "Catalina Muñoz", "8877-5689"),
  client("cli-amanda-rios", "Amanda Rios", "8888-6790"),
  client("cli-paz-contreras", "Paz Contreras", "8899-7801"),
  client("cli-javiera-leiva", "Javiera Leiva", "8811-8912"),
  client("cli-fernanda-castro", "Fernanda Castro", "8822-9023"),
  client("cli-antonia-reyes", "Antonia Reyes", "8833-0134"),
  client("cli-rocio-vargas", "Rocío Vargas", "8844-1245"),
  client("cli-camila-soto", "Camila Soto", "8855-2356"),
];

const SEED_SERVICES: ServiceType[] = [
  { id: "manicure", label: "Manicure clásica", color: "#E38FB3" },
  { id: "gel", label: "Manicure gel", color: "#C1527A" },
  { id: "pedicure", label: "Pedicura spa", color: "#C98A62" },
  { id: "acrylic", label: "Uñas acrílicas", color: "#9B6FA8" },
  { id: "nailart", label: "Nail art", color: "#5E8F8A" },
];

const SEED_STAFF: StaffMember[] = [
  { id: "staff-camila", name: "Camila", role: "manicurista", initials: "CA" },
  { id: "staff-rocio", name: "Rocio", role: "nail art", initials: "RG" },
  { id: "staff-paula", name: "Paula", role: "spa & pedicura", initials: "PM" },
];

function appt(
  id: string,
  date: string,
  time: string,
  duration: number,
  clientId: string,
  service: string,
): Appointment {
  return { id, date, time, duration, clientId, service, notes: "" };
}

function seedAppointmentsForWeek(mondayIso: string): Appointment[] {
  const d = (offsetDays: number) => {
    const base = new Date(mondayIso + "T00:00:00");
    base.setDate(base.getDate() + offsetDays);
    return base.toISOString().slice(0, 10);
  };
  return [
    appt("seed-lun-1", d(0), "09:30", 60, "cli-maria-fernanda", "gel"),
    appt("seed-lun-2", d(0), "11:00", 60, "cli-camila-rojas", "acrylic"),
    appt("seed-lun-3", d(0), "15:00", 60, "cli-isabel-duarte", "pedicure"),
    appt("seed-mar-1", d(1), "10:00", 90, "cli-valentina-cruz", "acrylic"),
    appt("seed-mar-2", d(1), "13:00", 60, "cli-sofia-mendoza", "manicure"),
    appt("seed-mar-3", d(1), "17:00", 60, "cli-renata-ibarra", "gel"),
    appt("seed-mie-1", d(2), "09:00", 60, "cli-daniela-ponce", "pedicure"),
    appt("seed-mie-2", d(2), "12:00", 60, "cli-lucia-herrera", "nailart"),
    appt("seed-mie-3", d(2), "16:30", 60, "cli-antonella-vidal", "gel"),
    appt("seed-jue-1", d(3), "11:00", 90, "cli-constanza-ruiz", "acrylic"),
    appt("seed-jue-2", d(3), "14:00", 60, "cli-josefina-salas", "manicure"),
    appt("seed-jue-3", d(3), "18:00", 60, "cli-trinidad-soto", "pedicure"),
    appt("seed-vie-1", d(4), "09:30", 60, "cli-florencia-araya", "manicure"),
    appt("seed-vie-2", d(4), "10:30", 60, "cli-martina-bravo", "gel"),
    appt("seed-vie-3", d(4), "12:00", 90, "cli-emilia-torres", "nailart"),
    appt("seed-vie-4", d(4), "15:00", 60, "cli-catalina-munoz", "manicure"),
    appt("seed-vie-5", d(4), "16:30", 60, "cli-amanda-rios", "gel"),
    appt("seed-vie-6", d(4), "18:00", 60, "cli-paz-contreras", "pedicure"),
    appt("seed-sab-1", d(5), "09:00", 60, "cli-javiera-leiva", "gel"),
    appt("seed-sab-2", d(5), "10:00", 60, "cli-fernanda-castro", "manicure"),
    appt("seed-sab-3", d(5), "11:30", 90, "cli-antonia-reyes", "nailart"),
    appt("seed-sab-4", d(5), "14:00", 60, "cli-rocio-vargas", "acrylic"),
    appt("seed-sab-5", d(5), "15:30", 60, "cli-camila-soto", "pedicure"),
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
