import fc from "fast-check";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { calculateAverageCost } from "@/domain/costing";
import { type Cents, cents, parseDbMoney } from "@/domain/money";
import { roundMinimumPrice } from "@/domain/price-rounding";
import { type MarginMode, calculateMinimumPrice, parsePercent, resolveMarginPolicy } from "@/domain/pricing";
import { Ratio } from "@/domain/ratio";

import { createLotWithStock, createVariant } from "../../helpers/fixtures";
import { type TestDatabase, createTestDatabase } from "../../helpers/pglite";

/**
 * Paridad TypeScript ↔ SQL (§4.5). El precio mínimo se calcula en el código
 * (para el panel) y en la base (para rechazar precios inválidos). Estos tests
 * generan datos al azar y verifican que ambas versiones den lo mismo.
 */
describe("paridad del precio mínimo entre TypeScript y SQL", () => {
  let t: TestDatabase;

  beforeAll(async () => {
    t = await createTestDatabase();
  });

  afterAll(async () => {
    await t.close();
  });

  it("soleil_round_minimum_price redondea igual que roundMinimumPrice", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.bigInt({ min: 0n, max: 10n ** 10n }),
        fc.bigInt({ min: 1n, max: 10_000n }),
        async (num, den) => {
          const { rows } = await t.client.query<{ cents: string }>(
            "SELECT soleil_round_minimum_price($1, $2)::text AS cents",
            [num.toString(), den.toString()],
          );
          expect(Number(rows[0]?.cents)).toBe(roundMinimumPrice(Ratio.of(num, den)));
        },
      ),
      { numRuns: 300 },
    );
  });

  describe("v_variant_pricing calcula el mismo precio mínimo que el código", () => {
    const lotArbitrary = fc.record({
      quantity: fc.integer({ min: 1, max: 30 }),
      costCents: fc.integer({ min: 100, max: 500_000 }),
      expired: fc.boolean(),
    });
    const marginArbitrary = fc.record({
      mode: fc.constantFrom<MarginMode | null>(null, "pct", "fixed", "max"),
      pct: fc.option(fc.integer({ min: 0, max: 20_000 }), { nil: null }),
      fixedCents: fc.integer({ min: 0, max: 50_000 }),
    });

    it("con lotes, vencidos y modos de margen al azar", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(lotArbitrary, { minLength: 1, maxLength: 5 }),
          marginArbitrary,
          async (lots, margin) => {
            const variantId = await createVariant(t.client, { salePriceBs: "999999.00" });
            const pctText = margin.pct === null ? null : (margin.pct / 100).toFixed(2);
            const fixedText =
              margin.mode === "fixed" || margin.mode === "max" ? (margin.fixedCents / 100).toFixed(2) : null;
            await t.client.query(
              "UPDATE product_variants SET margin_mode = $2, margin_pct = $3, margin_fixed_bs = $4 WHERE id = $1",
              [variantId, margin.mode, pctText, fixedText],
            );
            for (const lot of lots) {
              await createLotWithStock(t.client, variantId, {
                quantity: lot.quantity,
                costBs: (lot.costCents / 100).toFixed(2),
                expiresInDays: lot.expired ? 0 : 400,
              });
            }

            const expected = await minimumPriceFromCode(t, variantId, {
              mode: margin.mode,
              pct: pctText,
              fixed: fixedText === null ? null : parseDbMoney(fixedText),
            });
            const { rows } = await t.client.query<{ minimum_price_bs: string | null }>(
              "SELECT minimum_price_bs FROM v_variant_pricing WHERE variant_id = $1",
              [variantId],
            );
            const actual = rows[0]?.minimum_price_bs ?? null;
            expect(actual === null ? null : parseDbMoney(actual)).toBe(expected);
          },
        ),
        { numRuns: 60 },
      );
    });
  });

  describe("la base rechaza precios bajo el mínimo", () => {
    it("permite el mínimo o más, y rechaza menos", async () => {
      const variantId = await createVariant(t.client, { salePriceBs: "400.00" });
      await createLotWithStock(t.client, variantId, { quantity: 5, costBs: "200.00" });

      await expect(
        t.client.query("UPDATE product_variants SET sale_price_bs = 249.90 WHERE id = $1", [variantId]),
      ).rejects.toThrow(/menor al precio mínimo/);
      await t.client.query("UPDATE product_variants SET sale_price_bs = 250.00 WHERE id = $1", [variantId]);
      await t.client.query("UPDATE product_variants SET sale_price_bs = 300.00 WHERE id = $1", [variantId]);
    });

    it("sin compras no hay mínimo: el precio se pone a mano", async () => {
      const variantId = await createVariant(t.client, { salePriceBs: "100.00" });

      await expect(
        t.client.query("UPDATE product_variants SET sale_price_bs = 1.00 WHERE id = $1", [variantId]),
      ).resolves.toBeDefined();
    });

    it("no bloquea otras ediciones de una variante cuyo precio quedó bajo el mínimo", async () => {
      const variantId = await createVariant(t.client, { salePriceBs: "100.00" });
      await createLotWithStock(t.client, variantId, { quantity: 1, costBs: "200.00" });

      await expect(
        t.client.query(
          "UPDATE product_variants SET shade = 'Tono medio', sale_price_bs = sale_price_bs WHERE id = $1",
          [variantId],
        ),
      ).resolves.toBeDefined();
    });
  });
});

/** Calcula el precio mínimo con el código de src/domain a partir de los datos de la base. */
async function minimumPriceFromCode(
  t: TestDatabase,
  variantId: string,
  margin: { mode: MarginMode | null; pct: string | null; fixed: Cents | null },
): Promise<Cents | null> {
  const { rows: lots } = await t.client.query<{
    remaining: number;
    landed_unit_cost_bs: string;
    is_gift: boolean;
    is_expired: boolean;
  }>("SELECT remaining, landed_unit_cost_bs, is_gift, is_expired FROM v_lot_stock WHERE variant_id = $1", [variantId]);
  const { rows: last } = await t.client.query<{ landed_unit_cost_bs: string }>(
    `SELECT l.landed_unit_cost_bs FROM lots l JOIN purchases p ON p.id = l.purchase_id
     WHERE l.variant_id = $1 AND NOT l.is_gift AND p.status = 'registered'
     ORDER BY p.purchase_date DESC, l.created_at DESC, l.id DESC LIMIT 1`,
    [variantId],
  );
  const lastCost = last[0] ? parseDbMoney(last[0].landed_unit_cost_bs) : null;
  const average = calculateAverageCost(
    lots.map((lot) => ({
      remaining: lot.remaining,
      landedUnitCost: parseDbMoney(lot.landed_unit_cost_bs),
      isGift: lot.is_gift,
      isExpired: lot.is_expired,
    })),
    lastCost,
  );
  if (average === null) return null;

  const policy = resolveMarginPolicy(
    {
      marginMode: margin.mode,
      marginPct: margin.pct === null ? null : parsePercent(margin.pct),
      marginFixed: margin.fixed === null ? null : cents(margin.fixed),
    },
    parsePercent("25"),
  );
  return calculateMinimumPrice(average, policy);
}
