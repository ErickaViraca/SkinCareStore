import { describe, expect, it } from "vitest";

import { MAX_SKU_LENGTH, normalizeSku, numberedSku, suggestSku } from "@/domain/sku";

describe("suggestSku", () => {
  it("usa las iniciales de una marca de varias palabras, el producto y el tamaño", () => {
    expect(suggestSku({ brandName: "La Roche-Posay", productName: "Effaclar Gel", presentation: "200 ml" })).toBe(
      "LRP-EFFACLAR-GEL-200ML",
    );
  });

  it("usa las 3 primeras letras de una marca de una sola palabra y agrega el tono", () => {
    expect(suggestSku({ brandName: "Maybelline", productName: "Fit Me", shade: "Tono 110" })).toBe(
      "MAY-FIT-ME-TONO110",
    );
  });

  it("acorta palabras largas, toma hasta 3 palabras y quita tildes", () => {
    expect(suggestSku({ brandName: "CeraVe", productName: "Crème Hidratante Extraordinariamente Suave Plus" })).toBe(
      "CER-CREME-HIDRATAN-EXTRAORD",
    );
  });

  it("nunca pasa del largo máximo ni termina en guion", () => {
    const sku = suggestSku({
      brandName: "Una Marca Con Muchas Palabras Largas",
      productName: "Producto Extraordinariamente Largo",
      shade: "Tono Rosado Intenso Brillante",
      presentation: "Presentación Gigante",
    });
    expect(sku.length).toBeLessThanOrEqual(MAX_SKU_LENGTH);
    expect(sku).not.toMatch(/-$/);
  });

  it("si no hay letras ni números, sugiere SKU", () => {
    expect(suggestSku({ brandName: "--", productName: "!!" })).toBe("SKU");
  });
});

describe("numberedSku", () => {
  it("agrega un número para no repetir un código", () => {
    expect(numberedSku("LRP-GEL", 2)).toBe("LRP-GEL-2");
  });

  it("respeta el largo máximo al numerar", () => {
    const base = "A".repeat(MAX_SKU_LENGTH);
    const numbered = numberedSku(base, 12);
    expect(numbered).toHaveLength(MAX_SKU_LENGTH);
    expect(numbered.endsWith("-12")).toBe(true);
  });
});

describe("normalizeSku", () => {
  it("quita espacios a los lados y pasa a mayúsculas", () => {
    expect(normalizeSku("  abc-123 ")).toBe("ABC-123");
  });
});
