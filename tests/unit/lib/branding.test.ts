import { describe, expect, it } from "vitest";

import { DEFAULT_PALETTE, findContrastWarnings, sanitizePalette } from "@/lib/branding";

describe("sanitizePalette", () => {
  it("conserva los colores válidos y los pasa a mayúsculas", () => {
    const palette = sanitizePalette({ ...DEFAULT_PALETTE, primary: "#aabbcc" });
    expect(palette).toEqual({ ...DEFAULT_PALETTE, primary: "#AABBCC" });
  });

  it("reemplaza por el valor inicial los colores ausentes, nulos o inválidos", () => {
    const palette = sanitizePalette({ nav: "verde", danger: null, text: "#123" });
    expect(palette).toEqual(DEFAULT_PALETTE);
  });
});

describe("findContrastWarnings", () => {
  it("la paleta inicial aprobada se lee bien en todas las combinaciones", () => {
    expect(findContrastWarnings(DEFAULT_PALETTE)).toEqual([]);
  });

  it("avisa cuando una combinación no llega al contraste recomendado", () => {
    const warnings = findContrastWarnings({ ...DEFAULT_PALETTE, nav: "#C8E6C9" });
    const pairs = warnings.map((warning) => warning.pair);

    expect(pairs).toContain("Letras blancas sobre la navegación");
    expect(pairs).toContain("Títulos sobre el fondo");
    for (const warning of warnings) expect(warning.ratio).toBeLessThan(4.5);
  });
});
