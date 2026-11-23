import { describe, expect, it } from "vitest";

import { centsToInput, productInputFromForm, variantInputFromForm } from "@/components/products/form-data";
import { filterProducts } from "@/components/products/product-filters";
import { variantLabel } from "@/components/products/variants-section";

function form(entries: [string, string][]): FormData {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

describe("productInputFromForm", () => {
  it("arma el producto: textos, tipos de piel y casillas", () => {
    const input = productInputFromForm(
      form([
        ["name", "Effaclar"],
        ["brandId", "b"],
        ["categoryId", "c"],
        ["skinTypes", "oily"],
        ["skinTypes", "sensitive"],
        ["published", "on"],
        ["comingSoon", "on"],
      ]),
    );
    expect(input).toEqual({
      name: "Effaclar",
      brandId: "b",
      categoryId: "c",
      description: "",
      usageInstructions: "",
      skinTypes: ["oily", "sensitive"],
      published: true,
      featured: false,
      comingSoon: true,
    });
  });
});

describe("variantInputFromForm", () => {
  it("lee los campos con el prefijo variant.", () => {
    const input = variantInputFromForm(
      form([
        ["variant.shade", "110"],
        ["variant.salePrice", "289,90"],
        ["variant.marginMode", "pct"],
      ]),
    );
    expect(input).toMatchObject({ shade: "110", salePrice: "289,90", marginMode: "pct", sku: "", published: false });
  });
});

describe("centsToInput", () => {
  it("muestra los centavos con coma decimal", () => {
    expect(centsToInput(28990)).toBe("289,90");
    expect(centsToInput(5)).toBe("0,05");
    expect(centsToInput(null)).toBe("");
  });
});

describe("variantLabel", () => {
  it("une tono y tamaño, o dice Única", () => {
    expect(variantLabel({ shade: "110", presentation: "30 ml" })).toBe("110 · 30 ml");
    expect(variantLabel({ shade: null, presentation: "200 ml" })).toBe("200 ml");
    expect(variantLabel({ shade: null, presentation: null })).toBe("Única");
  });
});

describe("filterProducts", () => {
  const base = { brandName: "La Roche-Posay", categoryId: "rostro", searchText: "", comingSoon: false };
  const products = [
    { ...base, name: "Effaclar", published: true, archived: false, searchText: "LRP-EFFACLAR-200ML 200 ml" },
    { ...base, name: "Cicaplast", published: false, archived: false, comingSoon: true },
    { ...base, name: "Viejo", published: true, archived: true },
    { ...base, name: "Crema corporal", published: true, archived: false, categoryId: "cuerpo" },
  ];
  const names = (filters: Parameters<typeof filterProducts>[1]): string[] =>
    filterProducts(products, filters).map((product) => product.name);

  it("por defecto oculta los archivados", () => {
    expect(names({ query: "", status: "all", categoryId: null })).toEqual(["Effaclar", "Cicaplast", "Crema corporal"]);
  });

  it("filtra por estado", () => {
    expect(names({ query: "", status: "published", categoryId: null })).toEqual(["Effaclar", "Crema corporal"]);
    expect(names({ query: "", status: "draft", categoryId: null })).toEqual(["Cicaplast"]);
    expect(names({ query: "", status: "coming_soon", categoryId: null })).toEqual(["Cicaplast"]);
    expect(names({ query: "", status: "archived", categoryId: null })).toEqual(["Viejo"]);
  });

  it("filtra por categoría y busca por marca, código o tamaño", () => {
    expect(names({ query: "", status: "all", categoryId: "cuerpo" })).toEqual(["Crema corporal"]);
    expect(names({ query: "roche", status: "all", categoryId: "rostro" })).toEqual(["Effaclar", "Cicaplast"]);
    expect(names({ query: "200ml", status: "all", categoryId: null })).toEqual(["Effaclar"]);
  });
});
