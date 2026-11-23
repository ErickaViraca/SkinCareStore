import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { accountId, createLotWithStock, createProduct, createVariant, partnerId } from "../../helpers/fixtures";
import { type TestDatabase, createTestDatabase } from "../../helpers/pglite";

async function variantStock(t: TestDatabase, variantId: string) {
  const { rows } = await t.client.query<{
    on_hand: number;
    sellable: number;
    min_stock_effective: number;
    is_low: boolean;
  }>("SELECT on_hand, sellable, min_stock_effective, is_low FROM v_variant_stock WHERE variant_id = $1", [variantId]);
  return rows[0];
}

async function availability(t: TestDatabase, variantId: string): Promise<string | undefined> {
  const { rows } = await t.client.query<{ availability: string }>(
    "SELECT availability FROM public_catalog WHERE variant_id = $1",
    [variantId],
  );
  return rows[0]?.availability;
}

describe("vistas", () => {
  let t: TestDatabase;

  beforeAll(async () => {
    t = await createTestDatabase();
  });

  afterAll(async () => {
    await t.close();
  });

  describe("v_lot_stock y v_variant_stock", () => {
    it("el saldo de un lote es la suma de sus movimientos", async () => {
      const variantId = await createVariant(t.client);
      const lotId = await createLotWithStock(t.client, variantId, { quantity: 10 });
      await t.client.query(
        "INSERT INTO stock_movements (variant_id, lot_id, quantity, type, reason) VALUES ($1, $2, -2, 'damaged', 'roto')",
        [variantId, lotId],
      );

      const { rows } = await t.client.query("SELECT remaining, is_expired FROM v_lot_stock WHERE lot_id = $1", [lotId]);

      expect(rows).toEqual([{ remaining: 8, is_expired: false }]);
    });

    it("las unidades vencidas cuentan en el stock total pero no son vendibles", async () => {
      const variantId = await createVariant(t.client);
      await createLotWithStock(t.client, variantId, { quantity: 3, expiresInDays: 0 });
      await createLotWithStock(t.client, variantId, { quantity: 5, expiresInDays: 200 });

      expect(await variantStock(t, variantId)).toMatchObject({ on_hand: 8, sellable: 5 });
    });

    it("usa el stock mínimo de la tienda si la variante no tiene uno, y marca stock bajo", async () => {
      const variantId = await createVariant(t.client, { minStock: null });
      await createLotWithStock(t.client, variantId, { quantity: 2 });

      expect(await variantStock(t, variantId)).toMatchObject({ sellable: 2, min_stock_effective: 2, is_low: true });
    });

    it("una variante sin stock no se marca como stock bajo (está agotada)", async () => {
      const variantId = await createVariant(t.client);

      expect(await variantStock(t, variantId)).toMatchObject({ sellable: 0, is_low: false });
    });
  });

  describe("public_catalog", () => {
    it("muestra disponible, últimas unidades o agotado según el stock vendible", async () => {
      const available = await createVariant(t.client, { minStock: 2 });
      await createLotWithStock(t.client, available, { quantity: 5 });
      const low = await createVariant(t.client, { minStock: 2 });
      await createLotWithStock(t.client, low, { quantity: 2 });
      const out = await createVariant(t.client, { minStock: 2 });
      const onlyExpired = await createVariant(t.client, { minStock: 2 });
      await createLotWithStock(t.client, onlyExpired, { quantity: 4, expiresInDays: -1 });

      expect(await availability(t, available)).toBe("available");
      expect(await availability(t, low)).toBe("low_stock");
      expect(await availability(t, out)).toBe("out_of_stock");
      expect(await availability(t, onlyExpired)).toBe("out_of_stock");
    });

    it("sin stock muestra 'Disponible pronto' solo si la casilla del producto está marcada", async () => {
      const soonProduct = await createProduct(t.client);
      await t.client.query("UPDATE products SET coming_soon = true WHERE id = $1", [soonProduct]);
      const comingSoon = await createVariant(t.client, { productId: soonProduct, minStock: 2 });
      const withStock = await createVariant(t.client, { productId: soonProduct, minStock: 2 });
      await createLotWithStock(t.client, withStock, { quantity: 5 });

      expect(await availability(t, comingSoon)).toBe("coming_soon");
      // Con stock, la casilla no cambia nada: se ve disponible.
      expect(await availability(t, withStock)).toBe("available");
    });

    it("rechaza tipos de piel que no están en la lista", async () => {
      const productId = await createProduct(t.client);
      await expect(
        t.client.query("UPDATE products SET skin_types = ARRAY['grasa'] WHERE id = $1", [productId]),
      ).rejects.toThrow(/products_skin_types_known/);
      await t.client.query("UPDATE products SET skin_types = ARRAY['oily', 'sensitive'] WHERE id = $1", [productId]);
    });

    it("oculta variantes y productos no publicados o archivados", async () => {
      const unpublishedProduct = await createProduct(t.client, { published: false });
      const hiddenByProduct = await createVariant(t.client, { productId: unpublishedProduct });
      const archivedProduct = await createProduct(t.client, { archived: true });
      const hiddenByArchive = await createVariant(t.client, { productId: archivedProduct });
      const hiddenVariant = await createVariant(t.client, { published: false });

      expect(await availability(t, hiddenByProduct)).toBeUndefined();
      expect(await availability(t, hiddenByArchive)).toBeUndefined();
      expect(await availability(t, hiddenVariant)).toBeUndefined();
    });

    it("solo expone columnas públicas: nada de costos, lotes, vencimientos ni stock exacto", async () => {
      const { rows } = await t.client.query<{ column_name: string }>(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'public_catalog'",
      );

      expect(rows.map((row) => row.column_name).sort((a, b) => a.localeCompare(b))).toEqual([
        "availability",
        "brand_name",
        "brand_slug",
        "category_name",
        "category_slug",
        "description",
        "featured",
        "images",
        "presentation",
        "product_id",
        "product_name",
        "product_slug",
        "sale_price_bs",
        "shade",
        "skin_types",
        "sku",
        "usage_instructions",
        "variant_id",
      ]);
    });

    it("incluye las fotos del producto y las de su variante, en orden", async () => {
      const productId = await createProduct(t.client);
      const variantId = await createVariant(t.client, { productId });
      const otherVariantId = await createVariant(t.client, { productId });
      await t.client.query(
        `INSERT INTO product_images (product_id, variant_id, url, sort_order) VALUES
         ($1, NULL, 'general.jpg', 2), ($1, $2, 'tono.jpg', 1), ($1, $3, 'otro-tono.jpg', 0)`,
        [productId, variantId, otherVariantId],
      );

      const { rows } = await t.client.query<{ images: { url: string }[] }>(
        "SELECT images FROM public_catalog WHERE variant_id = $1",
        [variantId],
      );

      expect(rows[0]?.images.map((image) => image.url)).toEqual(["tono.jpg", "general.jpg"]);
    });
  });

  describe("v_account_balance", () => {
    it("el saldo de una cuenta es la suma de sus movimientos", async () => {
      const caja = await accountId(t.client, "Caja");
      await t.client.query(
        `INSERT INTO money_movements (account_id, amount_bs, type, note) VALUES
         ($1, 500, 'capital_in', 'aporte'), ($1, -400, 'expense', 'alquiler')`,
        [caja],
      );

      const { rows } = await t.client.query("SELECT balance_bs FROM v_account_balance WHERE account_id = $1", [caja]);

      expect(rows).toEqual([{ balance_bs: "100.00" }]);
    });
  });

  describe("v_partner_capital", () => {
    it("calcula el porcentaje de cada socia según su capital, o usa el fijado a mano", async () => {
      const vanessa = await partnerId(t.client, "Vanessa");
      const ericka = await partnerId(t.client, "Ericka");
      const banco = await accountId(t.client, "Banco");
      await t.client.query(
        `INSERT INTO capital_movements (partner_id, type, amount_bs, account_id) VALUES
         ($1, 'contribution', 6000, $3), ($2, 'contribution', 4000, $3), ($2, 'capital_withdrawal', 1000, $3)`,
        [vanessa, ericka, banco],
      );

      const computed = await t.client.query(
        "SELECT name, capital_balance_bs, share_pct FROM v_partner_capital ORDER BY name",
      );
      expect(computed.rows).toEqual([
        { name: "Ericka", capital_balance_bs: "3000.00", share_pct: "33.33" },
        { name: "Vanessa", capital_balance_bs: "6000.00", share_pct: "66.67" },
      ]);

      await t.client.query("UPDATE partners SET share_pct_override = 50");
      const overridden = await t.client.query("SELECT name, share_pct FROM v_partner_capital ORDER BY name");
      expect(overridden.rows).toEqual([
        { name: "Ericka", share_pct: "50.00" },
        { name: "Vanessa", share_pct: "50.00" },
      ]);
    });
  });
});
