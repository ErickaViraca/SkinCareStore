import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  type LotBalance,
  type PurchaseLineInput,
  calculateAverageCost,
  calculateLandedUnitCosts,
} from "@/domain/costing";
import { cents } from "@/domain/money";
import { Ratio } from "@/domain/ratio";

const line = (overrides: Partial<PurchaseLineInput> = {}): PurchaseLineInput => ({
  quantity: 1,
  freeQuantity: 0,
  unitPrice: cents(10000),
  isGift: false,
  ...overrides,
});

const lot = (overrides: Partial<LotBalance> = {}): LotBalance => ({
  remaining: 1,
  landedUnitCost: cents(20000),
  isGift: false,
  isExpired: false,
  ...overrides,
});

describe("calculateLandedUnitCosts (§4.2)", () => {
  it("ejemplo de la especificación: 10 Active Unify a 220 + 1 de regalo, 9 unidades más, envío 20 → 201", () => {
    const costs = calculateLandedUnitCosts(cents(2000), [
      line({ quantity: 10, freeQuantity: 1, unitPrice: cents(22000) }),
      line({ quantity: 9, unitPrice: cents(15000) }),
    ]);

    expect(costs).toEqual([20100, 15100]);
  });

  it("sin envío ni regalos, el costo real es el precio pagado", () => {
    expect(calculateLandedUnitCosts(cents(0), [line({ quantity: 3, unitPrice: cents(18000) })])).toEqual([18000]);
  });

  it("una línea de regalo de otro producto cuesta 0 y no recibe envío", () => {
    const costs = calculateLandedUnitCosts(cents(1000), [
      line({ quantity: 10, unitPrice: cents(20000) }),
      line({ quantity: 2, unitPrice: cents(0), isGift: true }),
    ]);

    expect(costs).toEqual([20100, 0]);
  });

  it("redondea hacia arriba al centavo: 3 unidades por 100 Bs → 33,34", () => {
    expect(
      calculateLandedUnitCosts(cents(0), [line({ quantity: 2, freeQuantity: 1, unitPrice: cents(5000) })]),
    ).toEqual([3334]);
  });

  it.each([
    ["cantidad 0", line({ quantity: 0 })],
    ["cantidad decimal", line({ quantity: 1.5 })],
    ["regalos negativos", line({ freeQuantity: -1 })],
    ["precio negativo", line({ unitPrice: cents(-1) })],
    ["regalo con precio", line({ isGift: true, unitPrice: cents(100) })],
  ])("rechaza una línea con %s", (_name, invalid) => {
    expect(() => calculateLandedUnitCosts(cents(0), [invalid])).toThrow(RangeError);
  });

  it("rechaza un envío negativo", () => {
    expect(() => calculateLandedUnitCosts(cents(-1), [line()])).toThrow(RangeError);
  });

  it("el total repartido cubre lo pagado más el envío, sin pasarse en más de 1 centavo por unidad", () => {
    const paidLine = fc.record({
      quantity: fc.integer({ min: 1, max: 50 }),
      freeQuantity: fc.integer({ min: 0, max: 5 }),
      unitPrice: fc.integer({ min: 0, max: 100_000 }).map(cents),
      isGift: fc.constant(false),
    });
    fc.assert(
      fc.property(
        fc.array(paidLine, { minLength: 1, maxLength: 8 }),
        fc.integer({ min: 0, max: 10_000 }),
        (lines, shipping) => {
          const costs = calculateLandedUnitCosts(cents(shipping), lines);
          const units = lines.reduce((total, l) => total + l.quantity + l.freeQuantity, 0);
          const realTotal = lines.reduce((total, l) => total + l.quantity * l.unitPrice, 0) + shipping;
          const assigned = lines.reduce(
            (total, l, index) => total + (costs[index] ?? 0) * (l.quantity + l.freeQuantity),
            0,
          );
          expect(assigned).toBeGreaterThanOrEqual(realTotal);
          expect(assigned - realTotal).toBeLessThan(units);
        },
      ),
    );
  });
});

describe("calculateAverageCost (§4.4)", () => {
  it("promedio ponderado exacto: 2 unidades a 200 y 10 a 240 → 233,333…", () => {
    const average = calculateAverageCost(
      [lot({ remaining: 2, landedUnitCost: cents(20000) }), lot({ remaining: 10, landedUnitCost: cents(24000) })],
      null,
    );

    expect(average?.compare(Ratio.of(280000, 12))).toBe(0);
  });

  it("no cuenta los regalos de otro producto, los vencidos ni los lotes sin saldo", () => {
    const average = calculateAverageCost(
      [
        lot({ remaining: 4, landedUnitCost: cents(20000) }),
        lot({ remaining: 5, landedUnitCost: cents(0), isGift: true }),
        lot({ remaining: 3, landedUnitCost: cents(9000), isExpired: true }),
        lot({ remaining: 0, landedUnitCost: cents(1000) }),
      ],
      null,
    );

    expect(average?.compare(Ratio.of(20000))).toBe(0);
  });

  it("si no queda stock pagado, usa el costo de la última compra pagada", () => {
    const average = calculateAverageCost([lot({ remaining: 2, isGift: true, landedUnitCost: cents(0) })], cents(23000));

    expect(average?.compare(Ratio.of(23000))).toBe(0);
  });

  it("sin stock pagado ni compras pagadas, no hay referencia (precio a mano)", () => {
    expect(calculateAverageCost([], null)).toBeNull();
  });

  it("el promedio siempre está entre el costo mínimo y el máximo de los lotes que cuentan", () => {
    const paidLot = fc.record({
      remaining: fc.integer({ min: 1, max: 100 }),
      landedUnitCost: fc.integer({ min: 0, max: 100_000 }).map(cents),
      isGift: fc.constant(false),
      isExpired: fc.constant(false),
    });
    fc.assert(
      fc.property(fc.array(paidLot, { minLength: 1, maxLength: 10 }), (lots) => {
        const average = calculateAverageCost(lots, null);
        const costs = lots.map((l) => l.landedUnitCost);
        expect(average?.compare(Ratio.of(Math.min(...costs)))).toBeGreaterThanOrEqual(0);
        expect(average?.compare(Ratio.of(Math.max(...costs)))).toBeLessThanOrEqual(0);
      }),
    );
  });
});
