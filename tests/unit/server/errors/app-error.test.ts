import { describe, expect, it } from "vitest";

import {
  AppError,
  BusinessRuleError,
  ConflictError,
  DatabaseError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  UnexpectedError,
  ValidationError,
  toAppError,
} from "@/server/errors/app-error";

describe("AppError", () => {
  it("cada subclase expone su código y un mensaje para la usuaria", () => {
    const error = new BusinessRuleError("No hay stock suficiente.", { context: { variantId: "v1" } });

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe("BUSINESS_RULE");
    expect(error.userMessage).toBe("No hay stock suficiente.");
    expect(error.context).toEqual({ variantId: "v1" });
    expect(error.name).toBe("BusinessRuleError");
    expect(error.logged).toBe(false);
  });

  it("ValidationError guarda los errores por campo", () => {
    const error = new ValidationError("Revisa los datos.", { sku: "El código ya existe." });

    expect(error.code).toBe("VALIDATION");
    expect(error.fieldErrors).toEqual({ sku: "El código ya existe." });
  });

  it("DatabaseError muestra un mensaje genérico y conserva la causa técnica", () => {
    const cause = new Error("connection refused");
    const error = new DatabaseError({ cause });

    expect(error.userMessage).not.toContain("connection refused");
    expect(error.cause).toBe(cause);
  });

  it("los errores de sesión y permisos tienen un mensaje por defecto", () => {
    expect(new UnauthorizedError().userMessage).toMatch(/sesión/);
    expect(new ForbiddenError().userMessage).toMatch(/permiso/);
    expect(new ConflictError("El código ya existe.").code).toBe("CONFLICT");
  });
});

describe("toAppError", () => {
  it("devuelve el mismo error si ya es un AppError", () => {
    const original = new NotFoundError("Producto no encontrado.");

    expect(toAppError(original)).toBe(original);
  });

  it("envuelve cualquier otro valor en UnexpectedError sin perder la causa", () => {
    const thrown = new TypeError("x is undefined");
    const error = toAppError(thrown);

    expect(error).toBeInstanceOf(UnexpectedError);
    expect(error.cause).toBe(thrown);
  });
});
