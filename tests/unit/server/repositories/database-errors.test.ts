import { describe, expect, it, vi } from "vitest";

import {
  ConflictError,
  DatabaseError,
  NotFoundError,
  UnexpectedError,
  ValidationError,
} from "@/server/errors/app-error";
import { type Logger } from "@/server/logger/logger";
import { firstOrThrow, withDatabaseErrors } from "@/server/repositories/database-errors";

function fakeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn<Logger["error"]>() };
}

const options = (logger: Logger) => ({ logger, table: "brands", operation: "insert", conflictMessage: "Repetido." });

describe("withDatabaseErrors", () => {
  it("devuelve el resultado si no hay error", async () => {
    await expect(withDatabaseErrors(options(fakeLogger()), async () => 7)).resolves.toBe(7);
  });

  it("traduce un valor repetido (aunque venga envuelto) a ConflictError sin registrarlo", async () => {
    const logger = fakeLogger();
    const driverError = Object.assign(new Error("duplicate key"), { code: "23505" });
    const wrapped = new Error("Failed query", { cause: driverError });

    const error: unknown = await withDatabaseErrors(options(logger), () => Promise.reject(wrapped)).catch(
      (thrown: unknown) => thrown,
    );

    expect(error).toBeInstanceOf(ConflictError);
    expect((error as ConflictError).userMessage).toBe("Repetido.");
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("traduce una regla CHECK conocida a un error del campo, sin registrarlo", async () => {
    const logger = fakeLogger();
    const driverError = Object.assign(new Error("check"), { code: "23514", constraint: "price_rule" });
    const error: unknown = await withDatabaseErrors(
      { ...options(logger), checkViolations: { price_rule: { field: "salePrice", message: "Precio bajo." } } },
      () => Promise.reject(new Error("Failed query", { cause: driverError })),
    ).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).fieldErrors).toEqual({ salePrice: "Precio bajo." });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("una regla CHECK desconocida es una falla de la base", async () => {
    const driverError = Object.assign(new Error("check"), { code: "23514", constraint: "otra" });
    await expect(withDatabaseErrors(options(fakeLogger()), () => Promise.reject(driverError))).rejects.toBeInstanceOf(
      DatabaseError,
    );
  });

  it("cualquier otra falla se registra una vez y se relanza como DatabaseError", async () => {
    const logger = fakeLogger();
    const error: unknown = await withDatabaseErrors(options(logger), () =>
      Promise.reject(Object.assign(new Error("timeout"), { code: "57014" })),
    ).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(DatabaseError);
    expect((error as DatabaseError).logged).toBe(true);
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it("deja pasar los errores de la aplicación sin cambiarlos", async () => {
    const original = new NotFoundError("No existe.");
    await expect(withDatabaseErrors(options(fakeLogger()), () => Promise.reject(original))).rejects.toBe(original);
  });
});

describe("firstOrThrow", () => {
  it("devuelve la primera fila o un error inesperado", () => {
    expect(firstOrThrow([1, 2], "brands")).toBe(1);
    expect(() => firstOrThrow([], "brands")).toThrow(UnexpectedError);
  });
});
