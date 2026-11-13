import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { sanitize } from "@/server/logger/logger";

/**
 * Ejemplo de test con secuencias aleatorias (fast-check): en vez de un caso
 * fijo, se generan cientos de objetos al azar y se verifica una regla que
 * siempre debe cumplirse.
 */
describe("sanitize (propiedades)", () => {
  it("nunca deja pasar el valor de una clave 'password'", () => {
    fc.assert(
      fc.property(fc.dictionary(fc.string(), fc.jsonValue()), fc.string(), (data, secret) => {
        const output = JSON.stringify(sanitize({ ...data, password: secret }));
        expect(JSON.parse(output)).toHaveProperty("password", "[oculto]");
      }),
    );
  });
});
