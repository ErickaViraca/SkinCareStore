import { describe, expect, it } from "vitest";

import { slugify } from "@/domain/slug";

describe("slugify", () => {
  it.each([
    ["La Roche-Posay", "la-roche-posay"],
    ["L'Oréal Paris", "l-oreal-paris"],
    ["  Cuidado   del   rostro ", "cuidado-del-rostro"],
    ["Protección solar FPS 50+", "proteccion-solar-fps-50"],
    ["Ñandú", "nandu"],
    ["COSRX", "cosrx"],
  ])("convierte %j en %j", (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });

  it("devuelve vacío si el nombre no tiene letras ni números", () => {
    expect(slugify(" -- !! ")).toBe("");
  });
});
