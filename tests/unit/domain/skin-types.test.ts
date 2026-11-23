import { describe, expect, it } from "vitest";

import { isSkinType, normalizeSkinTypes } from "@/domain/skin-types";

describe("tipos de piel", () => {
  it("reconoce solo los códigos de la lista", () => {
    expect(isSkinType("oily")).toBe(true);
    expect(isSkinType("grasa")).toBe(false);
  });

  it("quita repetidos y ordena según la lista", () => {
    expect(normalizeSkinTypes(["sensitive", "oily", "sensitive"])).toEqual(["oily", "sensitive"]);
  });
});
