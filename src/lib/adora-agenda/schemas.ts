import { z } from "zod";

const contactStatus = z.enum(["prospecto", "cliente", "inactivo"]);
const pipelineStageId = z.enum([
  "nuevo",
  "contactado",
  "calificado",
  "propuesta",
  "negociacion",
  "ganado",
  "perdido",
]);
const activityType = z.enum(["llamada", "reunion", "correo", "mensaje", "nota"]);
const taskStatus = z.enum(["pendiente", "en_progreso", "completada"]);
const taskPriority = z.enum(["baja", "media", "alta"]);
const userRole = z.enum(["administrador", "supervisor", "comercial"]);

export const clientInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  phone: z.string().trim().max(40).optional().default(""),
  email: z.string().trim().max(160).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
  company: z.string().trim().max(120).optional().default(""),
  location: z.string().trim().max(160).optional().default(""),
  source: z.string().trim().max(80).optional().default(""),
  status: contactStatus.optional().default("prospecto"),
  tags: z.array(z.string().trim().max(40)).max(20).optional().default([]),
  ownerId: z.string().trim().max(80).optional().default(""),
});

export const appointmentInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  duration: z.number().int().min(15).max(600),
  clientId: z.string().trim().min(1, "Selecciona o crea una clienta"),
  service: z.string().trim().min(1, "Selecciona un servicio"),
  notes: z.string().trim().max(2000).optional().default(""),
  opportunityId: z.string().trim().max(80).optional().default(""),
});

export const staffInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  role: z.string().trim().max(80).optional().default(""),
  initials: z.string().trim().max(3).optional().default(""),
  photoUrl: z.string().trim().max(2000).optional().default(""),
});

export const serviceInputSchema = z.object({
  label: z.string().trim().min(1, "El nombre del servicio es obligatorio").max(80),
  category: z.string().trim().max(80).optional().default(""),
  price: z.number().int().min(0).max(1000000).optional().default(0),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color inválido")
    .default("#C98999"),
});

export const opportunityInputSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(160),
  contactId: z.string().trim().min(1, "Selecciona un contacto"),
  ownerId: z.string().trim().max(80).optional().default(""),
  stage: pipelineStageId.optional().default("nuevo"),
  value: z.number().int().min(0).max(100000000).optional().default(0),
  closeDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
    .optional()
    .or(z.literal(""))
    .default(""),
  probability: z.number().int().min(0).max(100).optional().default(20),
  lossReason: z.string().trim().max(300).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
});

export const activityInputSchema = z.object({
  type: activityType,
  contactId: z.string().trim().min(1, "Selecciona un contacto"),
  opportunityId: z.string().trim().max(80).optional().default(""),
  subject: z.string().trim().min(1, "El asunto es obligatorio").max(160),
  notes: z.string().trim().max(2000).optional().default(""),
  ownerId: z.string().trim().max(80).optional().default(""),
});

export const taskInputSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(160),
  contactId: z.string().trim().max(80).optional().default(""),
  opportunityId: z.string().trim().max(80).optional().default(""),
  assigneeId: z.string().trim().max(80).optional().default(""),
  priority: taskPriority.optional().default("media"),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
    .optional()
    .or(z.literal(""))
    .default(""),
  status: taskStatus.optional().default("pendiente"),
  notes: z.string().trim().max(2000).optional().default(""),
});

export const userInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  username: z
    .string()
    .trim()
    .min(3, "El usuario debe tener al menos 3 caracteres")
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/, "Solo letras, números, puntos y guiones"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(200).optional(),
  role: userRole.optional().default("comercial"),
  active: z.boolean().optional().default(true),
});

export const settingsInputSchema = z.object({
  pipelineStages: z
    .array(
      z.object({
        id: pipelineStageId,
        label: z.string().trim().min(1).max(40),
        isWon: z.boolean(),
        isLost: z.boolean(),
      }),
    )
    .min(1)
    .optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(60).optional(),
  activityTypes: z
    .array(z.object({ id: activityType, label: z.string().trim().min(1).max(40) }))
    .optional(),
  taskPriorities: z
    .array(z.object({ id: taskPriority, label: z.string().trim().min(1).max(40) }))
    .optional(),
});
