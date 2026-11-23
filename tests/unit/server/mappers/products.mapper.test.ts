import { describe, expect, it } from "vitest";

import { averageCostToCents, toProductListItemDto, toVariantDto } from "@/server/mappers/products.mapper";

describe("mappers de productos", () => {
  it("redondea el costo promedio al centavo más cercano", () => {
    expect(averageCostToCents("123.4567")).toBe(12346);
    expect(averageCostToCents("123.4549")).toBe(12345);
    expect(averageCostToCents("10")).toBe(1000);
    expect(averageCostToCents(null)).toBeNull();
    expect(averageCostToCents("raro")).toBeNull();
  });

  it("convierte la variante a centavos y la fecha de archivo a sí/no", () => {
    const dto = toVariantDto({
      id: "v",
      productId: "p",
      sku: "LRP-1",
      barcode: null,
      shade: "110",
      presentation: null,
      salePriceBs: "289.90",
      minStock: null,
      marginMode: "fixed",
      marginPct: null,
      marginFixedBs: "20.00",
      published: true,
      archivedAt: null,
      sellable: 4,
      averageCostBs: "200.0000",
      minimumPriceBs: "250.00",
    });
    expect(dto).toMatchObject({
      salePriceCents: 28990,
      marginFixedCents: 2000,
      archived: false,
      averageCostCents: 20000,
      minimumPriceCents: 25000,
    });
    expect(dto).not.toHaveProperty("productId");
  });

  it("la lista lleva el precio desde en centavos (o null sin variantes)", () => {
    const row = {
      id: "p",
      name: "Effaclar",
      brandName: "LRP",
      categoryId: "c",
      categoryName: "Rostro",
      published: true,
      comingSoon: false,
      archivedAt: new Date(),
      variantCount: 0,
      priceFromBs: null,
      variantSearchText: "",
    };
    expect(toProductListItemDto(row)).toMatchObject({ archived: true, priceFromCents: null, searchText: "" });
    expect(toProductListItemDto({ ...row, priceFromBs: "120.00" }).priceFromCents).toBe(12000);
  });
});
