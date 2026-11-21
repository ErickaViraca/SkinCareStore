import { describe, expect, it } from "vitest";

import { type ParentCandidate, findParentProblem } from "@/domain/category-hierarchy";

const ROSTRO: ParentCandidate = { id: "rostro", parentId: null, archived: false };

describe("findParentProblem", () => {
  it("permite una categoría principal activa como padre", () => {
    expect(findParentProblem("serums", ROSTRO, false)).toBeNull();
    expect(findParentProblem(null, ROSTRO, false)).toBeNull();
  });

  it("no permite que una categoría esté dentro de sí misma", () => {
    expect(findParentProblem("rostro", ROSTRO, false)).toBe("self");
  });

  it("no permite un padre archivado", () => {
    expect(findParentProblem("serums", { ...ROSTRO, archived: true }, false)).toBe("parent-archived");
  });

  it("no permite un segundo nivel bajo una subcategoría", () => {
    expect(findParentProblem("vitamina-c", { id: "serums", parentId: "rostro", archived: false }, false)).toBe(
      "parent-is-subcategory",
    );
  });

  it("no permite mover dentro de otra a una categoría que ya tiene subcategorías", () => {
    expect(findParentProblem("cuerpo", ROSTRO, true)).toBe("has-subcategories");
  });
});
