import { describe, expect, it } from "vitest";

import { type LogLevel, createLogger, sanitize } from "@/server/logger/logger";

function captureLogs(): {
  lines: { level: LogLevel; entry: Record<string, unknown> }[];
  sink: (level: LogLevel, line: string) => void;
} {
  const lines: { level: LogLevel; entry: Record<string, unknown> }[] = [];
  return { lines, sink: (level, line) => lines.push({ level, entry: JSON.parse(line) as Record<string, unknown> }) };
}

describe("createLogger", () => {
  it("escribe una línea JSON con nivel, módulo, mensaje y contexto", () => {
    const { lines, sink } = captureLogs();
    createLogger("service:ventas", sink).info("Venta registrada", { saleNumber: 12 });

    expect(lines).toHaveLength(1);
    expect(lines[0]?.level).toBe("info");
    expect(lines[0]?.entry).toMatchObject({
      level: "info",
      scope: "service:ventas",
      message: "Venta registrada",
      context: { saleNumber: 12 },
    });
  });

  it("no escribe debug con el nivel por defecto (info)", () => {
    const { lines, sink } = captureLogs();
    createLogger("test", sink).debug("detalle");

    expect(lines).toHaveLength(0);
  });
});

describe("sanitize", () => {
  it("oculta valores sensibles", () => {
    expect(sanitize({ password: "123", nested: { Token: "abc" }, ok: 1 })).toEqual({
      password: "[oculto]",
      nested: { Token: "[oculto]" },
      ok: 1,
    });
  });

  it("convierte errores en objetos con su causa", () => {
    const result = sanitize(new Error("afuera", { cause: new Error("adentro") })) as Record<string, unknown>;

    expect(result).toMatchObject({ name: "Error", message: "afuera", cause: { message: "adentro" } });
  });
});
