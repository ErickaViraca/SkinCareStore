import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { cents } from "@/domain/money";
import { calculatePeriodResult, itemProfit, undistributedProfit } from "@/domain/profit";

describe("itemProfit", () => {
  it("utilidad exacta con el costo real del lote: 3 unidades, dos lotes distintos", () => {
    const fromOldLot = itemProfit({ quantity: 2, unitPrice: cents(30000), unitCost: cents(20000) });
    const fromNewLot = itemProfit({ quantity: 1, unitPrice: cents(30000), unitCost: cents(24000) });

    expect(fromOldLot + fromNewLot).toBe(26000);
  });

  it.each([0, -1, 1.5])("rechaza una cantidad de %s", (quantity) => {
    expect(() => itemProfit({ quantity, unitPrice: cents(1), unitCost: cents(1) })).toThrow(RangeError);
  });
});

describe("calculatePeriodResult (§4.13)", () => {
  it("ventas − costo − gastos − pérdidas = ganancia neta", () => {
    const result = calculatePeriodResult({
      soldItems: [
        { quantity: 2, unitPrice: cents(30000), unitCost: cents(20000) },
        { quantity: 1, unitPrice: cents(26000), unitCost: cents(23000) },
      ],
      expenses: [cents(40000)],
      inventoryAdjustments: [{ quantity: -1, unitCost: cents(18000) }],
    });

    expect(result).toEqual({
      revenue: 86000,
      costOfGoodsSold: 63000,
      grossProfit: 23000,
      expenses: 40000,
      inventoryLosses: 18000,
      netProfit: -35000,
    });
  });

  it("un ajuste positivo del cuadre reduce las pérdidas", () => {
    const result = calculatePeriodResult({
      soldItems: [],
      expenses: [],
      inventoryAdjustments: [
        { quantity: -2, unitCost: cents(10000) },
        { quantity: 1, unitCost: cents(10000) },
      ],
    });

    expect(result.inventoryLosses).toBe(10000);
    expect(result.netProfit).toBe(-10000);
  });

  it("un mes sin movimientos da cero", () => {
    expect(calculatePeriodResult({ soldItems: [], expenses: [], inventoryAdjustments: [] }).netProfit).toBe(0);
  });

  it("siempre se cumple la identidad del resultado", () => {
    const item = fc.record({
      quantity: fc.integer({ min: 1, max: 20 }),
      unitPrice: fc.integer({ min: 0, max: 100_000 }).map(cents),
      unitCost: fc.integer({ min: 0, max: 100_000 }).map(cents),
    });
    const adjustment = fc.record({
      quantity: fc.integer({ min: -10, max: 10 }).filter((q) => q !== 0),
      unitCost: fc.integer({ min: 0, max: 100_000 }).map(cents),
    });
    fc.assert(
      fc.property(
        fc.array(item),
        fc.array(fc.integer({ min: 1, max: 100_000 }).map(cents)),
        fc.array(adjustment),
        (soldItems, expenses, inventoryAdjustments) => {
          const r = calculatePeriodResult({ soldItems, expenses, inventoryAdjustments });
          expect(r.grossProfit).toBe(r.revenue - r.costOfGoodsSold);
          expect(r.netProfit).toBe(r.revenue - r.costOfGoodsSold - r.expenses - r.inventoryLosses);
          const itemsProfit = soldItems.reduce((total, i) => total + itemProfit(i), 0);
          expect(r.grossProfit).toBe(itemsProfit);
        },
      ),
    );
  });
});

describe("undistributedProfit", () => {
  it("suma las ganancias netas (también las negativas) y descuenta lo repartido", () => {
    expect(undistributedProfit([cents(100000), cents(-20000), cents(50000)], [cents(60000)])).toBe(70000);
  });
});
