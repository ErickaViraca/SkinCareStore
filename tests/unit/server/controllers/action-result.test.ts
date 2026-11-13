import { describe, expect, it, vi } from "vitest";

import { runAction } from "@/server/controllers/action-result";
import { BusinessRuleError, DatabaseError, ValidationError } from "@/server/errors/app-error";
import { type Logger } from "@/server/logger/logger";

function fakeLogger() {
  return {
    debug: vi.fn<Logger["debug"]>(),
    info: vi.fn<Logger["info"]>(),
    warn: vi.fn<Logger["warn"]>(),
    error: vi.fn<Logger["error"]>(),
  } satisfies Logger;
}

describe("runAction", () => {
  it("devuelve ok con los datos cuando la operación termina bien", async () => {
    const result = await runAction(fakeLogger(), "crearVenta", () => Promise.resolve({ id: "s1" }));

    expect(result).toEqual({ ok: true, data: { id: "s1" } });
  });

  it("convierte un error esperado en respuesta para la UI y lo registra como warn", async () => {
    const logger = fakeLogger();
    const result = await runAction(logger, "crearVenta", () =>
      Promise.reject(new BusinessRuleError("No hay stock suficiente.")),
    );

    expect(result).toEqual({ ok: false, error: { code: "BUSINESS_RULE", message: "No hay stock suficiente." } });
    expect(logger.warn).toHaveBeenCalledOnce();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("incluye los errores por campo de una validación", async () => {
    const result = await runAction(fakeLogger(), "crearProducto", () =>
      Promise.reject(new ValidationError("Revisa los datos.", { sku: "Obligatorio." })),
    );

    expect(result).toEqual({
      ok: false,
      error: { code: "VALIDATION", message: "Revisa los datos.", fieldErrors: { sku: "Obligatorio." } },
    });
  });

  it("registra como error las fallas técnicas sin mostrar el detalle a la usuaria", async () => {
    const logger = fakeLogger();
    const result = await runAction(logger, "crearVenta", () =>
      Promise.reject(new DatabaseError({ cause: new Error("timeout") })),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).not.toContain("timeout");
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it("envuelve errores desconocidos como UNEXPECTED", async () => {
    const result = await runAction(fakeLogger(), "crearVenta", () => Promise.reject(new Error("boom")));

    expect(result).toMatchObject({ ok: false, error: { code: "UNEXPECTED" } });
  });

  it("no vuelve a registrar un error que otra capa ya registró", async () => {
    const logger = fakeLogger();
    const error = new DatabaseError();
    error.logged = true;
    await runAction(logger, "crearVenta", () => Promise.reject(error));

    expect(logger.error).not.toHaveBeenCalled();
  });
});
