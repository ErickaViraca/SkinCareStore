import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { Ratio } from "@/domain/ratio";

describe("Ratio", () => {
  it("se guarda simplificado y con denominador positivo", () => {
    const value = Ratio.of(6, -4);

    expect(value.numerator).toBe(-3n);
    expect(value.denominator).toBe(2n);
  });

  it("calcula sin errores de punto flotante (0,1 + 0,2 = 0,3)", () => {
    const sum = Ratio.of(1, 10).add(Ratio.of(2, 10));

    expect(sum.compare(Ratio.of(3, 10))).toBe(0);
  });

  it("suma, resta, multiplica y divide", () => {
    const a = Ratio.of(2215, 11);

    expect(a.multiply(Ratio.of(11)).compare(Ratio.of(2215))).toBe(0);
    expect(a.divide(Ratio.of(2215, 11)).compare(Ratio.of(1))).toBe(0);
    expect(a.subtract(a).compare(Ratio.of(0))).toBe(0);
  });

  it.each([
    [7, 2, 3n, 4n],
    [-7, 2, -4n, -3n],
    [6, 3, 2n, 2n],
    [-6, 3, -2n, -2n],
  ])("floor y ceil de %i/%i", (numerator, denominator, floor, ceil) => {
    const value = Ratio.of(numerator, denominator);

    expect(value.floor()).toBe(floor);
    expect(value.ceil()).toBe(ceil);
  });

  it("isInteger", () => {
    expect(Ratio.of(10, 5).isInteger()).toBe(true);
    expect(Ratio.of(10, 4).isInteger()).toBe(false);
  });

  it("rechaza la división por cero y los decimales como entrada", () => {
    expect(() => Ratio.of(1, 0)).toThrow(RangeError);
    expect(() => Ratio.of(1).divide(Ratio.of(0))).toThrow(RangeError);
    expect(() => Ratio.of(0.5)).toThrow(RangeError);
  });

  it("floor ≤ valor ≤ ceil, y difieren en 1 salvo que sea entero", () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: -(10n ** 12n), max: 10n ** 12n }),
        fc.bigInt({ min: 1n, max: 10n ** 6n }),
        (n, d) => {
          const value = Ratio.of(n, d);
          expect(Ratio.of(value.floor()).compare(value)).toBeLessThanOrEqual(0);
          expect(Ratio.of(value.ceil()).compare(value)).toBeGreaterThanOrEqual(0);
          expect(value.ceil() - value.floor()).toBe(value.isInteger() ? 0n : 1n);
        },
      ),
    );
  });
});
