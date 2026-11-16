import { describe, expect, it } from "vitest";

import { loginErrorMessage } from "@/lib/login-errors";

describe("loginErrorMessage", () => {
  it("sin error no muestra mensaje", () => {
    expect(loginErrorMessage(undefined)).toBeNull();
  });

  it("explica que la cuenta no tiene acceso", () => {
    expect(loginErrorMessage("AccessDenied")).toBe("Esta cuenta no tiene acceso al panel.");
  });

  it("para cualquier otro error muestra un mensaje general", () => {
    expect(loginErrorMessage("Configuration")).toBe("No se pudo ingresar. Intenta de nuevo.");
    expect(loginErrorMessage(["AccessDenied", "x"])).toBe("No se pudo ingresar. Intenta de nuevo.");
  });
});
