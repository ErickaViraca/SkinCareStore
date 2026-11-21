import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { slugify } from "@/domain/slug";

describe("slugify (propiedades)", () => {
  it("siempre da minúsculas y números separados por un solo guion, sin guiones en los bordes", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 60 }), (name) => {
        expect(slugify(name)).toMatch(/^(?:[a-z0-9]+(?:-[a-z0-9]+)*)?$/);
      }),
    );
  });

  it("aplicarlo dos veces da lo mismo que una vez", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 60 }), (name) => {
        expect(slugify(slugify(name))).toBe(slugify(name));
      }),
    );
  });

  it("no depende de mayúsculas ni de espacios alrededor", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 60 }), (name) => {
        expect(slugify(`  ${name.toUpperCase()}  `)).toBe(slugify(name.toUpperCase()));
      }),
    );
  });
});
