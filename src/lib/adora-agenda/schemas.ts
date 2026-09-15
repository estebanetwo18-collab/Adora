import { z } from "zod";

export const clientInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  phone: z.string().trim().max(40).optional().default(""),
  email: z.string().trim().max(160).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
});

export const appointmentInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  duration: z.number().int().min(15).max(480),
  clientId: z.string().trim().min(1, "Selecciona o crea una clienta"),
  service: z.string().trim().min(1, "Selecciona un servicio"),
  notes: z.string().trim().max(2000).optional().default(""),
});

export const staffInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  role: z.string().trim().max(80).optional().default(""),
  initials: z.string().trim().max(3).optional().default(""),
});

export const serviceInputSchema = z.object({
  label: z.string().trim().min(1, "El nombre del servicio es obligatorio").max(80),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color inválido")
    .default("#C1527A"),
});
