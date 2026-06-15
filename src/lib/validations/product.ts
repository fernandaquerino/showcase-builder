import { z } from "zod";

import { parseBrlPrice } from "@/lib/price";
import { isSafeHttpUrl } from "@/lib/url";

const nameSchema = z
  .string()
  .trim()
  .min(2, "O nome deve ter pelo menos 2 caracteres.")
  .max(160, "O nome deve ter no máximo 160 caracteres.");

const categorySchema = z
  .string()
  .trim()
  .min(2, "A categoria deve ter pelo menos 2 caracteres.")
  .max(60, "A categoria deve ter no máximo 60 caracteres.");

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value === "" ? null : value));

const httpUrlSchema = (message: string) =>
  z.string().trim().min(1, message).refine(isSafeHttpUrl, message);

/** Optional URL that becomes `null` when empty (used for the extraction origin). */
const optionalUrlSchema = (message: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value !== "" ? value : null))
    .refine((value) => value === null || isSafeHttpUrl(value), message);

const priceSchema = z.string().transform((raw, ctx) => {
  const parsed = parseBrlPrice(raw);

  if (parsed.kind === "empty") {
    return null;
  }

  if (parsed.kind === "invalid") {
    ctx.addIssue({
      code: "custom",
      message: "Informe um preço válido, como 99,90.",
    });
    return z.NEVER;
  }

  return parsed.value;
});

export const productInputSchema = z.object({
  name: nameSchema,
  category: categorySchema,
  size: optionalText(30, "O tamanho deve ter no máximo 30 caracteres."),
  color: optionalText(50, "A cor deve ter no máximo 50 caracteres."),
  imageUrl: httpUrlSchema(
    "Cole o endereço de uma imagem pública (http/https).",
  ),
  productUrl: httpUrlSchema("Cole um link de compra válido (http/https)."),
  price: priceSchema,
  // Provenance: the link the creator pasted for extraction (may be empty).
  sourceUrl: optionalUrlSchema("Link de origem inválido."),
});

export const productIdSchema = z.uuid("Identificador inválido.");

export const reorderProductsSchema = z.object({
  orderedProductIds: z
    .array(z.uuid("Identificador inválido."))
    .min(1, "Envie ao menos um produto."),
});

/** Raw string fields the form binds to (schema input). */
export type ProductFormValues = z.input<typeof productInputSchema>;
/** Normalized values the schema produces (optional fields become `null`). */
export type ProductFormData = z.output<typeof productInputSchema>;
