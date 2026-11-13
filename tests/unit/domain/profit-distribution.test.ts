import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { cents } from "@/domain/money";
import {
  type PartnerShare,
  canDistribute,
  canWithdrawProfit,
  distributeProfit,
  resolvePartnerShares,
} from "@/domain/profit-distribution";
import { Ratio } from "@/domain/ratio";

describe("resolvePartnerShares (§4.12)", () => {
  it("según el capital de cada socia", () => {
    const result = resolvePartnerShares([
      { partnerId: "vanessa", capitalBalance: cents(600000), shareOverride: null },
      { partnerId: "ericka", capitalBalance: cents(300000), shareOverride: null },
    ]);

    if (!result.ok) throw new Error("se esperaba un resultado válido");
    expect(result.shares[0]?.share.compare(Ratio.of(2, 3))).toBe(0);
    expect(result.shares[1]?.share.compare(Ratio.of(1, 3))).toBe(0);
  });

  it("con porcentajes fijados a mano que suman 100%", () => {
    const result = resolvePartnerShares([
      { partnerId: "vanessa", capitalBalance: cents(600000), shareOverride: Ratio.of(1, 2) },
      { partnerId: "ericka", capitalBalance: cents(300000), shareOverride: Ratio.of(1, 2) },
    ]);

    expect(result.ok).toBe(true);
  });

  it.each([
    ["no_partners" as const, []],
    [
      "no_capital" as const,
      [
        { partnerId: "a", capitalBalance: cents(0), shareOverride: null },
        { partnerId: "b", capitalBalance: cents(0), shareOverride: null },
      ],
    ],
    [
      "overrides_incomplete" as const,
      [
        { partnerId: "a", capitalBalance: cents(100), shareOverride: Ratio.of(1, 2) },
        { partnerId: "b", capitalBalance: cents(100), shareOverride: null },
      ],
    ],
    [
      "overrides_not_100" as const,
      [
        { partnerId: "a", capitalBalance: cents(100), shareOverride: Ratio.of(1, 2) },
        { partnerId: "b", capitalBalance: cents(100), shareOverride: Ratio.of(1, 3) },
      ],
    ],
  ])("explica por qué no se puede calcular: %s", (reason, partners) => {
    expect(resolvePartnerShares(partners)).toEqual({ ok: false, reason });
  });
});

describe("distributeProfit (§4.13)", () => {
  it("reparte 1.000 Bs entre 2/3 y 1/3 sumando exacto: 666,67 y 333,33", () => {
    const lines = distributeProfit(cents(100000), [
      { partnerId: "vanessa", share: Ratio.of(2, 3) },
      { partnerId: "ericka", share: Ratio.of(1, 3) },
    ]);

    expect(lines.map((l) => [l.partnerId, l.amount])).toEqual([
      ["vanessa", 66667],
      ["ericka", 33333],
    ]);
  });

  it("rechaza porcentajes que no suman 100% y montos negativos", () => {
    expect(() => distributeProfit(cents(100), [{ partnerId: "a", share: Ratio.of(1, 2) }])).toThrow(RangeError);
    expect(() => distributeProfit(cents(-1), [{ partnerId: "a", share: Ratio.of(1) }])).toThrow(RangeError);
  });

  it("siempre suma exactamente el monto y nadie se aleja más de 1 centavo de su parte exacta", () => {
    const sharesArbitrary = fc
      .array(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 6 })
      .map((weights): PartnerShare[] => {
        const total = weights.reduce((t, w) => t + w, 0);
        return weights.map((weight, index) => ({ partnerId: `socia-${index}`, share: Ratio.of(weight, total) }));
      });
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100_000_000 }), sharesArbitrary, (amount, shares) => {
        const lines = distributeProfit(cents(amount), shares);
        expect(lines.reduce((total, line) => total + line.amount, 0)).toBe(amount);
        for (const line of lines) {
          const exact = Ratio.of(amount).multiply(line.share);
          const difference = Ratio.of(line.amount).subtract(exact);
          expect(difference.compare(Ratio.of(-1))).toBe(1);
          expect(difference.compare(Ratio.of(1))).toBe(-1);
        }
      }),
    );
  });
});

describe("límites de reparto y retiro (§4.13)", () => {
  it("no se reparte más que lo acumulado sin repartir", () => {
    expect(canDistribute(cents(50000), cents(50000))).toBe(true);
    expect(canDistribute(cents(50001), cents(50000))).toBe(false);
    expect(canDistribute(cents(0), cents(50000))).toBe(false);
  });

  it("una socia no retira más de lo que le tocó menos lo ya retirado", () => {
    expect(canWithdrawProfit(cents(30000), cents(66667), cents(36667))).toBe(true);
    expect(canWithdrawProfit(cents(30001), cents(66667), cents(36667))).toBe(false);
    expect(canWithdrawProfit(cents(0), cents(66667), cents(0))).toBe(false);
  });
});
