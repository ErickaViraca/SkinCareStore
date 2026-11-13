import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { cents } from "@/domain/money";
import { roundMinimumPrice, roundOfferPrice } from "@/domain/price-rounding";
import { Ratio } from "@/domain/ratio";

/** Monto exacto en centavos a partir de bolivianos escritos como texto ("250.01"). */
const bs = (text: string): Ratio => {
  const [whole = "0", fraction = ""] = text.split(".");
  const digits = fraction.length;
  return Ratio.of(BigInt(whole + fraction), 10n ** BigInt(digits)).multiply(Ratio.of(100));
};

/** ¿El precio (en centavos) es uno de los permitidos por la regla 5 / 9,90? (sin contar el redondo exacto) */
const endsInFiveOrNineNinety = (value: number): boolean => value % 1000 === 500 || value % 1000 === 990;

describe("roundMinimumPrice (§4.5)", () => {
  it.each([
    ["250.00", 25000],
    ["250.01", 25500],
    ["251.20", 25500],
    ["255.00", 25500],
    ["255.01", 25990],
    ["256.10", 25990],
    ["259.90", 25990],
    ["259.91", 26500],
    ["259.999", 26500],
    ["260.00", 26000],
    ["0", 0],
    ["0.01", 500],
  ])("%s Bs → %i centavos", (calculated, expected) => {
    expect(roundMinimumPrice(bs(calculated))).toBe(expected);
  });

  it("redondea fracciones de centavo una sola vez: 221500/11 centavos (201,3636… Bs) → 205", () => {
    expect(roundMinimumPrice(Ratio.of(221500, 11))).toBe(20500);
  });

  it("rechaza valores negativos", () => {
    expect(() => roundMinimumPrice(Ratio.of(-1))).toThrow(RangeError);
  });

  describe("propiedades", () => {
    const exactAmount = fc
      .tuple(fc.bigInt({ min: 0n, max: 10n ** 9n }), fc.bigInt({ min: 1n, max: 1000n }))
      .map(([n, d]) => Ratio.of(n, d));

    it("nunca queda por debajo del valor calculado", () => {
      fc.assert(
        fc.property(exactAmount, (value) => {
          expect(Ratio.of(roundMinimumPrice(value)).compare(value)).toBeGreaterThanOrEqual(0);
        }),
      );
    });

    it("termina en 5 o en 9,90, salvo que el cálculo sea exactamente un número redondo", () => {
      fc.assert(
        fc.property(exactAmount, (value) => {
          const result = roundMinimumPrice(value);
          const exactRound = value.isInteger() && value.numerator % 1000n === 0n;
          expect(exactRound ? result === Number(value.numerator) : endsInFiveOrNineNinety(result)).toBe(true);
        }),
      );
    });

    it("elige el menor precio permitido: ningún precio permitido más bajo cubre el valor calculado", () => {
      fc.assert(
        fc.property(exactAmount, (value) => {
          const result = roundMinimumPrice(value);
          if (result % 1000 === 0) return; // Número redondo exacto: ya se verificó arriba.
          // Precio permitido inmediatamente anterior: X5 → (X-1)9,90 ; X9,90 → X5.
          const previous = result % 1000 === 500 ? result - 510 : result - 490;
          const round = result - (result % 1000);
          expect(value.compare(Ratio.of(previous))).toBe(1);
          expect(value.compare(Ratio.of(round))).not.toBe(0);
        }),
      );
    });
  });
});

describe("roundOfferPrice (§4.8)", () => {
  it.each([
    ["284.00", 20000, 28400],
    ["283.47", 20000, 28340],
    ["260.00", 23000, 26000],
    ["283.47", 28345, 28350],
    ["283.45", 28345, 28350],
    ["283.40", 28340, 28340],
  ])("%s Bs con costo %i centavos → %i", (calculated, cost, expected) => {
    expect(roundOfferPrice(bs(calculated), cents(cost))).toBe(expected);
  });

  it("rechaza un precio de oferta menor al costo", () => {
    expect(() => roundOfferPrice(bs("199.99"), cents(20000))).toThrow(RangeError);
  });

  it("rechaza valores negativos", () => {
    expect(() => roundOfferPrice(Ratio.of(-1), cents(0))).toThrow(RangeError);
  });

  it("nunca queda por debajo del costo y siempre es múltiplo de 0,10 o igual al costo redondeado hacia arriba", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 1, max: 100 }),
        (cost, margin, denominator) => {
          const exact = Ratio.of(cost).add(Ratio.of(margin, denominator));
          const result = roundOfferPrice(exact, cents(cost));
          expect(result).toBeGreaterThanOrEqual(cost);
          expect(result % 10).toBe(0);
          // Solo sube por encima del valor calculado cuando bajar cruzaría el costo.
          if (Ratio.of(result).compare(exact) > 0) {
            expect(Math.floor(Number(exact.floor()) / 10) * 10).toBeLessThan(cost);
          }
        },
      ),
    );
  });
});
