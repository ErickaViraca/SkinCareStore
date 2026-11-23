import { describe, expect, it } from "vitest";

import { createProductSchema, productFieldsSchema, variantFieldsSchema } from "@/server/dto/products.dto";

const ID = "6f1c1f9e-8d43-4a43-9b0e-1d2b3c4d5e6f";

const errorsOf = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((result.error?.issues ?? []).map((issue) => [issue.path.join("."), issue.message]));

describe("DTO de variantes", () => {
  it("convierte montos, stock y porcentaje, y deja vacíos como null", () => {
    const parsed = variantFieldsSchema.parse({
      sku: "  ",
      shade: " 110 ",
      salePrice: "289,90",
      minStock: "3",
      marginMode: "max",
      marginPct: "30,5",
      marginFixed: "20",
    });
    expect(parsed).toEqual({
      sku: null,
      barcode: null,
      shade: "110",
      presentation: null,
      salePrice: 28990,
      minStock: 3,
      marginMode: "max",
      marginPct: "30.5",
      marginFixed: 2000,
      published: true,
    });
  });

  it("modo de margen vacío = el de la tienda", () => {
    expect(variantFieldsSchema.parse({ salePrice: "10", marginMode: "" }).marginMode).toBeNull();
  });

  it("explica los errores de cada campo", () => {
    const result = variantFieldsSchema.safeParse({
      salePrice: "abc",
      minStock: "-1",
      marginPct: "mucho",
      marginFixed: "x",
    });
    expect(errorsOf(result)).toMatchObject({
      salePrice: expect.stringMatching(/Monto inválido/),
      minStock: expect.stringMatching(/número entero/),
      marginPct: expect.stringMatching(/Porcentaje inválido/),
      marginFixed: expect.stringMatching(/Monto inválido/),
    });
  });

  it("los modos fijo y el mayor exigen el monto fijo", () => {
    expect(errorsOf(variantFieldsSchema.safeParse({ salePrice: "10", marginMode: "fixed" }))).toEqual({
      marginFixed: "Este modo de margen necesita un monto fijo.",
    });
  });
});

describe("DTO de productos", () => {
  it("normaliza los tipos de piel y rechaza los desconocidos", () => {
    const parsed = productFieldsSchema.parse({
      name: " Effaclar ",
      brandId: ID,
      categoryId: ID,
      skinTypes: ["sensitive", "oily", "oily"],
    });
    expect(parsed).toMatchObject({
      name: "Effaclar",
      description: "",
      usageInstructions: null,
      skinTypes: ["oily", "sensitive"],
      published: false,
      comingSoon: false,
    });
    expect(
      productFieldsSchema.safeParse({ name: "X", brandId: ID, categoryId: ID, skinTypes: ["grasa"] }).success,
    ).toBe(false);
  });

  it("al crear, los errores de la variante vienen con el prefijo variant.", () => {
    const result = createProductSchema.safeParse({
      name: "",
      brandId: "x",
      categoryId: ID,
      variant: { salePrice: "" },
    });
    expect(Object.keys(errorsOf(result))).toEqual(expect.arrayContaining(["name", "brandId", "variant.salePrice"]));
  });
});
