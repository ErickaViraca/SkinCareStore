import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { type FefoLot, allocateFefo, isExpired, sellableLotsInFefoOrder } from "@/domain/fefo";

const TODAY = "2026-11-13";

const lot = (lotId: string, remaining: number, expiresOn: string | null, receivedOn = "2026-01-01"): FefoLot => ({
  lotId,
  remaining,
  expiresOn,
  receivedOn,
});

describe("isExpired", () => {
  it("vence desde su fecha de vencimiento, inclusive", () => {
    expect(isExpired("2026-11-12", TODAY)).toBe(true);
    expect(isExpired("2026-11-13", TODAY)).toBe(true);
    expect(isExpired("2026-11-14", TODAY)).toBe(false);
    expect(isExpired(null, TODAY)).toBe(false);
  });
});

describe("sellableLotsInFefoOrder", () => {
  it("ordena por vencimiento, deja al final los que no vencen y desempata por llegada", () => {
    const ordered = sellableLotsInFefoOrder(
      [
        lot("sin-fecha", 1, null),
        lot("tarde", 1, "2027-06-01"),
        lot("temprano-nuevo", 1, "2027-01-01", "2026-05-01"),
        lot("temprano-viejo", 1, "2027-01-01", "2026-02-01"),
      ],
      TODAY,
    );

    expect(ordered.map((l) => l.lotId)).toEqual(["temprano-viejo", "temprano-nuevo", "tarde", "sin-fecha"]);
  });

  it("excluye lotes vencidos y lotes sin saldo", () => {
    const ordered = sellableLotsInFefoOrder(
      [lot("vencido", 5, TODAY), lot("vacio", 0, "2027-01-01"), lot("ok", 2, "2027-01-01")],
      TODAY,
    );

    expect(ordered.map((l) => l.lotId)).toEqual(["ok"]);
  });
});

describe("allocateFefo", () => {
  it("toma primero del lote que vence antes y completa con el siguiente", () => {
    const result = allocateFefo([lot("nuevo", 10, "2028-01-01"), lot("viejo", 2, "2027-01-01")], 3, TODAY);

    expect(result).toEqual({
      ok: true,
      allocations: [
        { lotId: "viejo", quantity: 2 },
        { lotId: "nuevo", quantity: 1 },
      ],
    });
  });

  it("si no alcanza, informa cuántas unidades vendibles hay (sin contar las vencidas)", () => {
    const result = allocateFefo([lot("vencido", 9, "2026-01-01"), lot("ok", 2, "2027-01-01")], 3, TODAY);

    expect(result).toEqual({ ok: false, available: 2 });
  });

  it.each([0, -1, 1.5])("rechaza una cantidad de %s", (quantity) => {
    expect(() => allocateFefo([lot("a", 5, null)], quantity, TODAY)).toThrow(RangeError);
  });

  describe("propiedades", () => {
    const anyLot = fc.record({
      lotId: fc.uuid(),
      remaining: fc.integer({ min: 0, max: 20 }),
      expiresOn: fc.option(
        fc
          .date({ min: new Date("2025-01-01"), max: new Date("2029-12-31"), noInvalidDate: true })
          .map((d) => d.toISOString().slice(0, 10)),
        { nil: null },
      ),
      receivedOn: fc.constant("2026-01-01"),
    });

    it("reparte exactamente la cantidad pedida, sin pasar el saldo de ningún lote ni usar vencidos", () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(anyLot, { selector: (l) => l.lotId, maxLength: 8 }),
          fc.integer({ min: 1, max: 60 }),
          (lots, quantity) => {
            const result = allocateFefo(lots, quantity, TODAY);
            const sellable = lots.filter((l) => !isExpired(l.expiresOn, TODAY)).reduce((t, l) => t + l.remaining, 0);

            if (!result.ok) {
              expect(result.available).toBe(sellable);
              expect(sellable).toBeLessThan(quantity);
              return;
            }
            expect(result.allocations.reduce((t, a) => t + a.quantity, 0)).toBe(quantity);
            for (const allocation of result.allocations) {
              const source = lots.find((l) => l.lotId === allocation.lotId);
              expect(allocation.quantity).toBeGreaterThan(0);
              expect(allocation.quantity).toBeLessThanOrEqual(source?.remaining ?? 0);
              expect(isExpired(source?.expiresOn ?? null, TODAY)).toBe(false);
            }
          },
        ),
      );
    });

    it("nunca toma de un lote que vence después mientras queda saldo en uno que vence antes", () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(anyLot, { selector: (l) => l.lotId, maxLength: 8 }),
          fc.integer({ min: 1, max: 60 }),
          (lots, quantity) => {
            const result = allocateFefo(lots, quantity, TODAY);
            if (!result.ok) return;
            const used = new Map(result.allocations.map((a) => [a.lotId, a.quantity]));
            const ordered = sellableLotsInFefoOrder(lots, TODAY);
            // En orden FEFO, todos los lotes usados salvo el último se vacían por completo.
            const usedInOrder = ordered.filter((l) => used.has(l.lotId));
            usedInOrder.slice(0, -1).forEach((l) => expect(used.get(l.lotId)).toBe(l.remaining));
            expect(usedInOrder.map((l) => l.lotId)).toEqual(ordered.slice(0, usedInOrder.length).map((l) => l.lotId));
          },
        ),
      );
    });
  });
});
