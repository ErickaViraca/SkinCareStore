import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { type ExpiryTier, addMonths, calculateOfferPrice, findExpiryTier, offerForLot } from "@/domain/offers";
import { cents } from "@/domain/money";

const TODAY = "2026-11-13";
const TIERS: readonly ExpiryTier[] = [
  { months: 6, discountPct: 10 },
  { months: 3, discountPct: 25 },
  { months: 2, discountPct: 50 },
];

describe("addMonths", () => {
  it.each([
    ["2026-11-13", 2, "2027-01-13"],
    ["2026-11-13", 6, "2027-05-13"],
    ["2026-08-31", 6, "2027-02-28"],
    ["2027-11-30", 3, "2028-02-29"],
  ])("%s + %i meses = %s", (date, months, expected) => {
    expect(addMonths(date, months)).toBe(expected);
  });
});

describe("findExpiryTier (§4.8)", () => {
  it.each([
    ["2027-05-13", 10],
    ["2027-02-13", 25],
    ["2027-01-13", 50],
    ["2026-11-14", 50],
  ])("un lote que vence el %s está en el escalón de %i%%", (expiresOn, discountPct) => {
    expect(findExpiryTier(expiresOn, TODAY, TIERS)?.discountPct).toBe(discountPct);
  });

  it("no hay oferta si vence en más de 6 meses, si no tiene fecha o si ya venció", () => {
    expect(findExpiryTier("2027-05-14", TODAY, TIERS)).toBeNull();
    expect(findExpiryTier(null, TODAY, TIERS)).toBeNull();
    expect(findExpiryTier(TODAY, TODAY, TIERS)).toBeNull();
  });
});

describe("calculateOfferPrice (§4.8)", () => {
  it.each([
    [10, 28400],
    [25, 27500],
    [50, 26000],
  ])("ejemplo de la especificación: precio 290, costo 230, %i%% de la ganancia → %i", (discount, expected) => {
    expect(calculateOfferPrice(cents(29000), cents(23000), discount)).toBe(expected);
  });

  it("redondea a 0,10 hacia abajo: precio 299, costo 230,47, 10% → 292,147 → 292,10", () => {
    expect(calculateOfferPrice(cents(29900), cents(23047), 10)).toBe(29210);
  });

  it("sin ganancia no hay oferta", () => {
    expect(calculateOfferPrice(cents(23000), cents(23000), 50)).toBeNull();
    expect(calculateOfferPrice(cents(22000), cents(23000), 50)).toBeNull();
  });

  it("no hay oferta si el descuento es 0 o si al redondear no baja del precio normal", () => {
    expect(calculateOfferPrice(cents(29000), cents(23000), 0)).toBeNull();
    expect(calculateOfferPrice(cents(23009), cents(23001), 10)).toBeNull();
  });

  it.each([-1, 101, Number.NaN, 12.345])("rechaza un descuento de %s", (discount) => {
    expect(() => calculateOfferPrice(cents(29000), cents(23000), discount)).toThrow(RangeError);
  });

  it("la oferta siempre está entre el costo (inclusive) y el precio normal (exclusive)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 100 }),
        (cost, profit, discount) => {
          const offer = calculateOfferPrice(cents(cost + profit), cents(cost), discount);
          if (offer === null) return;
          expect(offer).toBeGreaterThanOrEqual(cost);
          expect(offer).toBeLessThan(cost + profit);
        },
      ),
    );
  });
});

describe("offerForLot", () => {
  it("aplica el escalón del lote al precio normal", () => {
    expect(offerForLot({ expiresOn: "2027-01-01", landedUnitCost: cents(23000) }, cents(29000), TODAY, TIERS)).toEqual({
      tier: { months: 2, discountPct: 50 },
      offerPrice: 26000,
    });
  });

  it("sin escalón o sin ganancia no hay oferta", () => {
    expect(
      offerForLot({ expiresOn: "2028-01-01", landedUnitCost: cents(23000) }, cents(29000), TODAY, TIERS),
    ).toBeNull();
    expect(
      offerForLot({ expiresOn: "2027-01-01", landedUnitCost: cents(29000) }, cents(29000), TODAY, TIERS),
    ).toBeNull();
  });
});
