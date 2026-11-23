import "server-only";

import { z } from "zod";

import { type Cents, parseMoneyInput } from "@/domain/money";
import { SKIN_TYPES, normalizeSkinTypes } from "@/domain/skin-types";
import { MAX_SKU_LENGTH } from "@/domain/sku";

import { idSchema } from "./taxonomy.dto";

/** DTO de entrada y salida de productos y variantes (etapa 3c). */

/** Texto opcional: vacío o solo espacios → `null`. */
const optionalText = (max: number): z.ZodType<string | null> =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .nullish()
    .transform((value) => value || null);

/** Monto escrito en el formulario ("289,90") → centavos. */
const moneySchema = z.string({ error: "Escribe el monto." }).transform((text, context): Cents => {
  const amount = parseMoneyInput(text);
  if (amount === null) {
    context.addIssue({ code: "custom", message: "Monto inválido. Ejemplo: 289,90" });
    return z.NEVER;
  }
  return amount;
});

const optionalMoney = z
  .string()
  .nullish()
  .transform((text, context): Cents | null => {
    if (!text?.trim()) return null;
    const amount = parseMoneyInput(text);
    if (amount === null) {
      context.addIssue({ code: "custom", message: "Monto inválido. Ejemplo: 20,00" });
      return z.NEVER;
    }
    return amount;
  });

/** Porcentaje de margen ("25" o "25,5") → texto para la base ("25.5"). Vacío → `null`. */
const optionalPercent = z
  .string()
  .nullish()
  .transform((text, context): string | null => {
    const value = text?.trim() ?? "";
    if (value === "") return null;
    if (!/^\d{1,3}(?:[.,]\d{1,2})?$/.test(value)) {
      context.addIssue({ code: "custom", message: "Porcentaje inválido. Ejemplo: 25" });
      return z.NEVER;
    }
    return value.replace(",", ".");
  });

/** Stock mínimo: vacío → `null` (usa el de la tienda). */
const optionalStock = z
  .string()
  .nullish()
  .transform((text, context): number | null => {
    const value = text?.trim() ?? "";
    if (value === "") return null;
    if (!/^\d{1,5}$/.test(value)) {
      context.addIssue({ code: "custom", message: "Escribe un número entero (0 o más)." });
      return z.NEVER;
    }
    return Number(value);
  });

export const productFieldsSchema = z.object({
  name: z
    .string({ error: "Escribe el nombre." })
    .trim()
    .min(1, "Escribe el nombre.")
    .max(120, "Máximo 120 caracteres."),
  brandId: idSchema,
  categoryId: idSchema,
  description: z
    .string()
    .trim()
    .max(4000, "Máximo 4000 caracteres.")
    .nullish()
    .transform((value) => value ?? ""),
  usageInstructions: optionalText(4000),
  skinTypes: z
    .array(z.enum(SKIN_TYPES, { error: "Tipo de piel desconocido." }))
    .default([])
    .transform(normalizeSkinTypes),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  comingSoon: z.boolean().default(false),
});
export type ProductFieldsInput = z.output<typeof productFieldsSchema>;

export const variantFieldsSchema = z
  .object({
    // Vacío → el sistema sugiere uno (marca + producto + tono/tamaño).
    sku: optionalText(MAX_SKU_LENGTH),
    barcode: optionalText(40),
    shade: optionalText(60),
    presentation: optionalText(60),
    salePrice: moneySchema,
    minStock: optionalStock,
    // Vacío → usa el margen de la tienda.
    marginMode: z
      .union([z.enum(["pct", "fixed", "max"]), z.literal("")])
      .nullish()
      .transform((value) => value || null),
    marginPct: optionalPercent,
    marginFixed: optionalMoney,
    published: z.boolean().default(true),
  })
  .superRefine((value, context) => {
    if ((value.marginMode === "fixed" || value.marginMode === "max") && value.marginFixed === null) {
      context.addIssue({
        code: "custom",
        path: ["marginFixed"],
        message: "Este modo de margen necesita un monto fijo.",
      });
    }
  });
export type VariantFieldsInput = z.output<typeof variantFieldsSchema>;

export const createProductSchema = productFieldsSchema.extend({ variant: variantFieldsSchema });
export type CreateProductInput = z.output<typeof createProductSchema>;

export const updateProductSchema = productFieldsSchema.extend({ id: idSchema });
export const addVariantSchema = z.object({ productId: idSchema, variant: variantFieldsSchema });
export const updateVariantSchema = z.object({ id: idSchema, variant: variantFieldsSchema });

/** Un producto en la lista del panel. Montos en centavos. */
export interface ProductListItemDto {
  readonly id: string;
  readonly name: string;
  readonly brandName: string;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly published: boolean;
  readonly comingSoon: boolean;
  readonly archived: boolean;
  readonly variantCount: number;
  readonly priceFromCents: number | null;
  readonly searchText: string;
}

/** Una variante en la ficha del producto. Montos en centavos. */
export interface VariantDto {
  readonly id: string;
  readonly sku: string;
  readonly barcode: string | null;
  readonly shade: string | null;
  readonly presentation: string | null;
  readonly salePriceCents: number;
  readonly minStock: number | null;
  readonly marginMode: "pct" | "fixed" | "max" | null;
  readonly marginPct: string | null;
  readonly marginFixedCents: number | null;
  readonly published: boolean;
  readonly archived: boolean;
  readonly sellable: number;
  /** `null` mientras no haya compras. */
  readonly averageCostCents: number | null;
  readonly minimumPriceCents: number | null;
}

/** Ficha completa de un producto. */
export interface ProductDetailDto {
  readonly id: string;
  readonly name: string;
  readonly brandId: string;
  readonly categoryId: string;
  readonly description: string;
  readonly usageInstructions: string | null;
  readonly skinTypes: readonly string[];
  readonly published: boolean;
  readonly featured: boolean;
  readonly comingSoon: boolean;
  readonly archived: boolean;
  readonly imageCount: number;
  readonly variants: readonly VariantDto[];
}

/** Opción de un selector (marca o categoría activa). */
export interface OptionDto {
  readonly id: string;
  readonly label: string;
}
