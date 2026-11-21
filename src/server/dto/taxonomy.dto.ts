import "server-only";

import { z } from "zod";

/** DTO de entrada y salida de marcas y categorías (docs/ESPECIFICACION.md §3.2). */

const nameSchema = z
  .string({ error: "Escribe el nombre." })
  .trim()
  .min(1, "Escribe el nombre.")
  .max(80, "Máximo 80 caracteres.");

export const idSchema = z.uuid({ error: "Identificador inválido." });

export const brandInputSchema = z.object({ name: nameSchema });
export type BrandInput = z.output<typeof brandInputSchema>;

export const categoryInputSchema = z.object({
  name: nameSchema,
  // El formulario envía "" cuando no se elige categoría padre.
  parentId: z
    .union([idSchema, z.literal("")])
    .nullish()
    .transform((value) => value || null),
});
export type CategoryInput = z.output<typeof categoryInputSchema>;

export const updateBrandSchema = brandInputSchema.extend({ id: idSchema });
export const updateCategorySchema = categoryInputSchema.extend({ id: idSchema });

/** Una marca en la lista del panel. */
export interface BrandDto {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly archived: boolean;
  readonly productCount: number;
}

/** Una categoría en la lista del panel. */
export interface CategoryDto {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly parentId: string | null;
  readonly parentName: string | null;
  readonly archived: boolean;
  readonly productCount: number;
}
