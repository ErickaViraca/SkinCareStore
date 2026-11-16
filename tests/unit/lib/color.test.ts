import { describe, expect, it } from "vitest";

import { MIN_READABLE_CONTRAST, contrastRatio, isHexColor, relativeLuminance } from "@/lib/color";

describe("isHexColor", () => {
  it.each(["#000000", "#FAF6E3", "#d6d22e"])("acepta %s", (value) => {
    expect(isHexColor(value)).toBe(true);
  });

  it.each(["", "000000", "#FFF", "#GGGGGG", "#0000000", "red"])("rechaza %j", (value) => {
    expect(isHexColor(value)).toBe(false);
  });
});

describe("relativeLuminance", () => {
  it("vale 0 para el negro y 1 para el blanco", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 10);
  });

  it("usa el tramo lineal para canales muy oscuros", () => {
    expect(relativeLuminance("#010101")).toBeCloseTo(1 / 255 / 12.92, 10);
  });

  it("falla con un color inválido", () => {
    expect(() => relativeLuminance("#FFF")).toThrow(RangeError);
  });
});

describe("contrastRatio", () => {
  it("negro sobre blanco es 21 y no depende del orden", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 10);
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 10);
  });

  it("un color sobre sí mismo es 1", () => {
    expect(contrastRatio("#D6D22E", "#D6D22E")).toBe(1);
  });

  it("el gris #767676 sobre blanco llega justo al mínimo recomendado", () => {
    expect(contrastRatio("#767676", "#FFFFFF")).toBeGreaterThanOrEqual(MIN_READABLE_CONTRAST);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeLessThan(MIN_READABLE_CONTRAST);
  });
});
