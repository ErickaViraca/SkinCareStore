import { describe, expect, it } from "vitest";

import { filterRows, normalizeForSearch } from "@/components/catalog/taxonomy-filter";

const ROWS = [
  { name: "Sérums", detail: "Rostro", archived: false },
  { name: "Limpiadores", detail: "Rostro", archived: false },
  { name: "Maquillaje", detail: null, archived: true },
];

describe("normalizeForSearch", () => {
  it("quita tildes, mayúsculas y espacios en los bordes", () => {
    expect(normalizeForSearch("  Sérum ÑANDÚ ")).toBe("serum nandu");
  });
});

describe("filterRows", () => {
  it("sin búsqueda muestra solo las activas", () => {
    expect(filterRows(ROWS, "", false).map((row) => row.name)).toEqual(["Sérums", "Limpiadores"]);
  });

  it("incluye las archivadas cuando se piden", () => {
    expect(filterRows(ROWS, "", true)).toHaveLength(3);
  });

  it("busca sin importar tildes ni mayúsculas", () => {
    expect(filterRows(ROWS, "SERUM", false).map((row) => row.name)).toEqual(["Sérums"]);
  });

  it("también busca en el detalle (categoría padre)", () => {
    expect(filterRows(ROWS, "rostro", false)).toHaveLength(2);
  });
});
