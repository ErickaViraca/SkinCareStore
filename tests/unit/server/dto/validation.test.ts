import { describe, expect, it } from "vitest";

import { brandInputSchema, categoryInputSchema, idSchema } from "@/server/dto/taxonomy.dto";
import { parseOrThrow } from "@/server/dto/validation";
import { ValidationError } from "@/server/errors/app-error";

function validationErrorOf(run: () => unknown): ValidationError {
  try {
    run();
  } catch (error: unknown) {
    if (error instanceof ValidationError) return error;
  }
  throw new Error("Se esperaba un ValidationError");
}

describe("parseOrThrow con los DTO de marcas y categorías", () => {
  it("limpia los espacios del nombre", () => {
    expect(parseOrThrow(brandInputSchema, { name: "  Isdin  " })).toEqual({ name: "Isdin" });
  });

  it("devuelve el error debajo del campo", () => {
    const error = validationErrorOf(() => parseOrThrow(brandInputSchema, { name: "   " }));
    expect(error.fieldErrors).toEqual({ name: "Escribe el nombre." });
  });

  it("rechaza un nombre que no es texto o es demasiado largo", () => {
    expect(validationErrorOf(() => parseOrThrow(brandInputSchema, { name: 5 })).fieldErrors.name).toBe(
      "Escribe el nombre.",
    );
    expect(validationErrorOf(() => parseOrThrow(brandInputSchema, { name: "a".repeat(81) })).fieldErrors.name).toBe(
      "Máximo 80 caracteres.",
    );
  });

  it("convierte la categoría padre vacía o ausente en null", () => {
    expect(parseOrThrow(categoryInputSchema, { name: "Rostro", parentId: "" })).toEqual({
      name: "Rostro",
      parentId: null,
    });
    expect(parseOrThrow(categoryInputSchema, { name: "Rostro" }).parentId).toBeNull();
  });

  it("rechaza una categoría padre que no es un id", () => {
    const error = validationErrorOf(() => parseOrThrow(categoryInputSchema, { name: "Sérums", parentId: "rostro" }));
    expect(error.fieldErrors).toHaveProperty("parentId");
  });

  it("un error sin campo queda en 'form'", () => {
    expect(validationErrorOf(() => parseOrThrow(idSchema, "no-es-uuid")).fieldErrors).toEqual({
      form: "Identificador inválido.",
    });
  });
});
