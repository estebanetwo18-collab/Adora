// ---------- Agenda (original booking calendar — kept intact) ----------

// The synthetic "client" that represents blocked time (lunch, holidays) in
// the agenda — not a real contact, so every CRM module (Contactos,
// Oportunidades, Actividades) must filter it out. Lives here (not in
// store.ts) so client components can import it without pulling in the
// server-only Redis client.
export const INTERNAL_CLIENT_ID = "cli-interno";

export type ContactStatus = "prospecto" | "cliente" | "inactivo";

// "Client" is the contact record shared by the agenda (booking) and the CRM
// (contactos) modules — a prospecto and a clienta are the same underlying
// record, distinguished by `status`, so converting one into the other never
// requires moving/duplicating appointment history.
export type Client = {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  company: string;
  location: string;
  source: string; // origen: referido, instagram, walk-in, etc.
  status: ContactStatus;
  tags: string[];
  ownerId: string; // CrmUser.id responsable del contacto; "" = sin asignar
  createdAt: string;
  updatedAt: string;
  createdBy: string; // CrmUser.id o "" si se creó antes de tener usuarios
  updatedBy: string;
};

export type Appointment = {
  id: string;
  date: string; // YYYY-MM-DD, local salon date
  time: string; // HH:MM, 24h
  duration: number; // minutes
  clientId: string;
  service: string; // ServiceType.id
  notes: string;
  opportunityId: string; // Opportunity.id opcional, "" si no aplica
};

export type StaffMember = {
  id: string;
  name: string;
  role: string;
  initials: string;
  photoUrl: string; // optional; falls back to initials when empty
};

export type ServiceType = {
  id: string;
  label: string;
  category: string;
  price: number; // colones
  color: string; // hex
};

// ---------- CRM ----------

export type PipelineStageId =
  | "nuevo"
  | "contactado"
  | "calificado"
  | "propuesta"
  | "negociacion"
  | "ganado"
  | "perdido";

export type Opportunity = {
  id: string;
  title: string;
  contactId: string;
  ownerId: string;
  stage: PipelineStageId;
  value: number; // colones
  closeDate: string; // YYYY-MM-DD, "" si no definida
  probability: number; // 0-100
  lossReason: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
};

export type ActivityType = "llamada" | "reunion" | "correo" | "mensaje" | "nota";

// Entrada de la línea de tiempo de un contacto — registro de una interacción
// ya ocurrida (a diferencia de Task, que es algo pendiente de hacer).
export type Activity = {
  id: string;
  type: ActivityType;
  contactId: string;
  opportunityId: string;
  subject: string;
  notes: string;
  ownerId: string;
  createdAt: string;
  createdBy: string;
};

export type TaskStatus = "pendiente" | "en_progreso" | "completada";
export type TaskPriority = "baja" | "media" | "alta";

export type CrmTask = {
  id: string;
  title: string;
  contactId: string;
  opportunityId: string;
  assigneeId: string;
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD, "" si no definida
  status: TaskStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
};

export type UserRole = "administrador" | "supervisor" | "comercial";

export type CrmUser = {
  id: string;
  name: string;
  username: string;
  passwordHash: string; // "salt:hash" hex, PBKDF2-SHA256 — ver auth.ts
  role: UserRole;
  active: boolean;
  createdAt: string;
};

export type PipelineStageConfig = {
  id: PipelineStageId;
  label: string;
  isWon: boolean;
  isLost: boolean;
};

export type CrmSettings = {
  pipelineStages: PipelineStageConfig[];
  tags: string[];
  activityTypes: { id: ActivityType; label: string }[];
  taskPriorities: { id: TaskPriority; label: string }[];
};

export type AgendaState = {
  clients: Client[];
  appointments: Appointment[];
  staff: StaffMember[];
  services: ServiceType[];
  opportunities: Opportunity[];
  activities: Activity[];
  tasks: CrmTask[];
  users: CrmUser[];
  settings: CrmSettings;
};

// Never send a CrmUser.passwordHash to the browser — every API response
// that carries state must go through toClientState() (api-helpers.ts),
// which produces this shape instead of the server-side AgendaState.
export type PublicUser = Omit<CrmUser, "passwordHash">;
export type ClientAgendaState = Omit<AgendaState, "users"> & { users: PublicUser[] };
