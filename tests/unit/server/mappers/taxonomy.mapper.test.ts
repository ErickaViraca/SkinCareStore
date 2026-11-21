import { describe, expect, it } from "vitest";

import { toBrandDto, toCategoryDto } from "@/server/mappers/taxonomy.mapper";

describe("mappers de marcas y categorías", () => {
  it("convierte la fecha de archivo en un sí/no", () => {
    const base = { id: "1", name: "Isdin", slug: "isdin", productCount: 3 };
    expect(toBrandDto({ ...base, archivedAt: null })).toEqual({ ...base, archived: false });
    expect(toBrandDto({ ...base, archivedAt: new Date() }).archived).toBe(true);
  });

  it("incluye el padre de la categoría y nada más", () => {
    const dto = toCategoryDto({
      id: "2",
      name: "Sérums",
      slug: "serums",
      parentId: "1",
      parentName: "Rostro",
      archivedAt: null,
      productCount: 0,
    });
    expect(dto).toEqual({
      id: "2",
      name: "Sérums",
      slug: "serums",
      parentId: "1",
      parentName: "Rostro",
      archived: false,
      productCount: 0,
    });
  });
});
