import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { accountId, createLotWithStock, createPurchase, createVariant, partnerId } from "../../helpers/fixtures";
import { type TestDatabase, createTestDatabase } from "../../helpers/pglite";

/**
 * Las reglas críticas viven también en la base de datos (guía de backend §10):
 * aunque el código tuviera un error, la base rechaza los datos inválidos.
 */
describe("reglas dentro de la base de datos", () => {
  let t: TestDatabase;

  beforeAll(async () => {
    t = await createTestDatabase();
  });

  afterAll(async () => {
    await t.close();
  });

  describe("catálogo", () => {
    it("rechaza un SKU repetido", async () => {
      const variantId = await createVariant(t.client);
      const { rows } = await t.client.query<{ sku: string; product_id: string }>(
        "SELECT sku, product_id FROM product_variants WHERE id = $1",
        [variantId],
      );
      const existing = rows[0];

      await expect(
        t.client.query("INSERT INTO product_variants (product_id, sku, sale_price_bs) VALUES ($1, $2, 100)", [
          existing?.product_id,
          existing?.sku,
        ]),
      ).rejects.toThrow(/duplicate key/);
    });

    it("rechaza un precio de venta negativo", async () => {
      await expect(createVariant(t.client, { salePriceBs: "-1" })).rejects.toThrow(/sale_price_non_negative/);
    });
  });

  describe("lotes", () => {
    it("rechaza un lote con cantidad 0", async () => {
      const variantId = await createVariant(t.client);
      const purchaseId = await createPurchase(t.client);

      await expect(
        t.client.query(
          "INSERT INTO lots (purchase_id, variant_id, quantity, unit_price_bs, landed_unit_cost_bs) VALUES ($1, $2, 0, 1, 1)",
          [purchaseId, variantId],
        ),
      ).rejects.toThrow(/lots_quantity_positive/);
    });

    it("rechaza un lote de regalo con costo", async () => {
      const variantId = await createVariant(t.client);
      const purchaseId = await createPurchase(t.client);

      await expect(
        t.client.query(
          `INSERT INTO lots (purchase_id, variant_id, quantity, is_gift, unit_price_bs, landed_unit_cost_bs)
           VALUES ($1, $2, 1, true, 50, 50)`,
          [purchaseId, variantId],
        ),
      ).rejects.toThrow(/lots_gift_has_zero_cost/);
    });
  });

  describe("movimientos de stock", () => {
    it("rechaza una venta con cantidad positiva (el signo debe corresponder al tipo)", async () => {
      const variantId = await createVariant(t.client);
      const lotId = await createLotWithStock(t.client, variantId);

      await expect(
        t.client.query(
          "INSERT INTO stock_movements (variant_id, lot_id, quantity, type, reason) VALUES ($1, $2, 1, 'expired', 'x')",
          [variantId, lotId],
        ),
      ).rejects.toThrow(/stock_movements_sign_matches_type/);
    });

    it("rechaza un movimiento de venta sin ítem de venta", async () => {
      const variantId = await createVariant(t.client);
      const lotId = await createLotWithStock(t.client, variantId);

      await expect(
        t.client.query("INSERT INTO stock_movements (variant_id, lot_id, quantity, type) VALUES ($1, $2, -1, 'sale')", [
          variantId,
          lotId,
        ]),
      ).rejects.toThrow(/stock_movements_sale_reference/);
    });
  });

  describe("ventas", () => {
    it("rechaza cobrar menos que el costo real del lote (§4.7)", async () => {
      const variantId = await createVariant(t.client);
      const lotId = await createLotWithStock(t.client, variantId, { costBs: "200.00" });
      const { rows } = await t.client.query<{ id: string }>(
        "INSERT INTO sales (channel, total_bs) VALUES ('store', 150) RETURNING id",
      );

      await expect(
        t.client.query(
          `INSERT INTO sale_items (sale_id, variant_id, lot_id, quantity, list_price_bs, unit_price_bs, unit_cost_bs)
           VALUES ($1, $2, $3, 1, 280, 150, 200)`,
          [rows[0]?.id, variantId, lotId],
        ),
      ).rejects.toThrow(/sale_items_price_not_below_cost/);
    });

    it("rechaza un canal de venta inexistente", async () => {
      await expect(t.client.query("INSERT INTO sales (channel, total_bs) VALUES ('mercado', 10)")).rejects.toThrow(
        /invalid input value for enum/,
      );
    });
  });

  describe("dinero y capital", () => {
    it("rechaza un pago de compra de socia sin socia", async () => {
      const purchaseId = await createPurchase(t.client);
      const caja = await accountId(t.client, "Caja");

      await expect(
        t.client.query(
          "INSERT INTO purchase_payments (purchase_id, source, account_id, amount_bs) VALUES ($1, 'partner', $2, 100)",
          [purchaseId, caja],
        ),
      ).rejects.toThrow(/purchase_payments_source_matches/);
    });

    it("rechaza un movimiento de gasto con monto positivo", async () => {
      const caja = await accountId(t.client, "Caja");

      await expect(
        t.client.query("INSERT INTO money_movements (account_id, amount_bs, type) VALUES ($1, 400, 'expense')", [caja]),
      ).rejects.toThrow(/money_movements_sign_matches_type/);
    });

    it("rechaza un retiro de ganancias que no está ligado a un reparto", async () => {
      const vanessa = await partnerId(t.client, "Vanessa");
      const banco = await accountId(t.client, "Banco");

      await expect(
        t.client.query(
          "INSERT INTO capital_movements (partner_id, type, amount_bs, account_id) VALUES ($1, 'profit_withdrawal', 100, $2)",
          [vanessa, banco],
        ),
      ).rejects.toThrow(/capital_movements_profit_withdrawal_has_distribution/);
    });

    it("rechaza un reparto cuyas partes no suman la ganancia disponible", async () => {
      await expect(
        t.client.query(
          `INSERT INTO profit_distributions (period_from, period_to, net_profit_available_bs, distributed_bs, reinvested_bs)
           VALUES ('2026-01-01', '2026-03-31', 1000, 600, 300)`,
        ),
      ).rejects.toThrow(/profit_distributions_parts_add_up/);
    });
  });
});
