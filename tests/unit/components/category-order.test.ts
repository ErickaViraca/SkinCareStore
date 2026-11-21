import { describe, expect, it } from "vitest";

import { orderAsTree } from "@/components/catalog/category-order";

describe("orderAsTree", () => {
  it("pone cada subcategoría debajo de su categoría principal, todo por nombre", () => {
    const ordered = orderAsTree([
      { id: "s", name: "Serums", parentId: "r" },
      { id: "c", name: "Cuerpo", parentId: null },
      { id: "r", name: "Rostro", parentId: null },
      { id: "l", name: "Limpiadores", parentId: "r" },
      { id: "h", name: "Hidratantes", parentId: "c" },
    ]);
    expect(ordered.map((category) => category.name)).toEqual([
      "Cuerpo",
      "Hidratantes",
      "Rostro",
      "Limpiadores",
      "Serums",
    ]);
  });

  it("muestra como principal una subcategoría cuyo padre no está en la lista", () => {
    const ordered = orderAsTree([{ id: "s", name: "Serums", parentId: "no-esta" }]);
    expect(ordered.map((category) => category.id)).toEqual(["s"]);
  });

  it("ordena con las reglas del español (tildes)", () => {
    const ordered = orderAsTree([
      { id: "2", name: "Óleos", parentId: null },
      { id: "3", name: "Uñas", parentId: null },
      { id: "1", name: "Ojos", parentId: null },
    ]);
    expect(ordered.map((category) => category.name)).toEqual(["Ojos", "Óleos", "Uñas"]);
  });
});
