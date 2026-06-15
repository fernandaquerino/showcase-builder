import { z } from "zod";

import { slugify } from "@/lib/slug";

/** Suggested platforms for the form select. Stored as free text in the DB. */
export const PLATFORM_OPTIONS = [
  "Instagram",
  "TikTok",
  "YouTube",
  "Outra",
] as const;

function isValidCalendarDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value === "" ? null : value));

const titleSchema = z
  .string()
  .trim()
  .min(3, "O título deve ter pelo menos 3 caracteres.")
  .max(120, "O título deve ter no máximo 120 caracteres.");

const storeSchema = z
  .string()
  .trim()
  .min(2, "A loja deve ter pelo menos 2 caracteres.")
  .max(80, "A loja deve ter no máximo 80 caracteres.");

const liveDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.")
  .refine(isValidCalendarDate, "Informe uma data válida.");

const liveTimeSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(value),
    "Informe um horário válido (HH:mm).",
  )
  .transform((value) => (value === "" ? null : value));

const slugSchema = z
  .string()
  .trim()
  .min(1, "Informe o endereço da live.")
  .transform(slugify)
  .pipe(
    z
      .string()
      .min(3, "O endereço deve ter pelo menos 3 caracteres.")
      .max(80, "O endereço deve ter no máximo 80 caracteres.")
      .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen."),
  );

export const liveInputSchema = z.object({
  title: titleSchema,
  subtitle: optionalText(200, "O subtítulo deve ter no máximo 200 caracteres."),
  store: storeSchema,
  liveDate: liveDateSchema,
  liveTime: liveTimeSchema,
  platform: optionalText(40, "A plataforma deve ter no máximo 40 caracteres."),
  slug: slugSchema,
});

export const liveIdSchema = z.uuid("Identificador inválido.");

/** Raw string fields the form binds to (schema input). */
export type LiveFormValues = z.input<typeof liveInputSchema>;
/** Normalized values the schema produces (optional fields become `null`). */
export type LiveFormData = z.output<typeof liveInputSchema>;
