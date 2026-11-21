import "server-only";

import { type z } from "zod";

import { ValidationError } from "@/server/errors/app-error";

/**
 * Valida una entrada no confiable con su esquema (guía de backend §3.2).
 * Si falla, lanza `ValidationError` con el primer mensaje de cada campo,
 * listo para mostrarlo debajo del campo en el formulario.
 */
export function parseOrThrow<Schema extends z.ZodType>(schema: Schema, input: unknown): z.output<Schema> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path.join(".") || "form";
    fieldErrors[field] ??= issue.message;
  }
  throw new ValidationError("Revisa los datos marcados.", fieldErrors);
}
