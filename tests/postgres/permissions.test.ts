import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createLotWithStock, createVariant } from "../helpers/fixtures";
import { type IsolatedDatabase, createIsolatedDatabase, hasTestDatabase } from "../helpers/postgres";

import type { PoolClient } from "pg";

const PERMISSION_DENIED = { code: "42501" };

/**
 * Permisos de los usuarios de base de datos (docs/ESPECIFICACION.md §3.8 y §6).
 * Se prueban contra un Postgres real porque PGlite no reproduce bien los roles.
 * Cada test ejecuta las consultas "como" el rol con SET ROLE, dentro de una
 * transacción que se revierte al final.
 */
describe.skipIf(!hasTestDatabase)("permisos de los usuarios de base de datos", () => {
  let database: IsolatedDatabase;
  let variantId: string;
  let lotId: string;

  beforeAll(async () => {
    database = await createIsolatedDatabase();
    variantId = await createVariant(database.pool);
    lotId = await createLotWithStock(database.pool, variantId);
  });

  afterAll(async () => {
    await database.drop();
  });

  async function asRole<T>(role: "soleil_app" | "soleil_web", run: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await database.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`SET LOCAL ROLE ${role}`);
      return await run(client);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  }

  describe("soleil_web (página pública)", () => {
    it("puede leer las vistas públicas", async () => {
      await asRole("soleil_web", async (client) => {
        const { rows } = await client.query("SELECT availability FROM public_catalog WHERE variant_id = $1", [
          variantId,
        ]);
        expect(rows).toEqual([{ availability: "available" }]);
        await client.query("SELECT * FROM public_brands");
        await client.query("SELECT * FROM public_categories");
        await client.query("SELECT * FROM public_settings");
      });
    });

    it.each([
      "lots",
      "sales",
      "purchases",
      "suppliers",
      "capital_movements",
      "product_variants",
      "v_variant_stock",
      "v_variant_pricing",
    ])("no puede leer %s", async (table) => {
      await asRole("soleil_web", async (client) => {
        await expect(client.query(`SELECT * FROM ${table}`)).rejects.toMatchObject(PERMISSION_DENIED);
      });
    });

    it("no puede escribir", async () => {
      await asRole("soleil_web", async (client) => {
        await expect(client.query("INSERT INTO brands (name, slug) VALUES ('x', 'x')")).rejects.toMatchObject(
          PERMISSION_DENIED,
        );
      });
    });
  });

  describe("soleil_app (panel)", () => {
    it("puede registrar datos nuevos, incluida una venta con número correlativo", async () => {
      await asRole("soleil_app", async (client) => {
        const { rows } = await client.query<{ sale_number: number }>(
          "INSERT INTO sales (channel, total_bs) VALUES ('store', 280) RETURNING sale_number",
        );
        expect(rows[0]?.sale_number).toBeGreaterThan(0);
      });
    });

    it("no puede borrar registros (se archivan o se anulan)", async () => {
      await asRole("soleil_app", async (client) => {
        await expect(client.query("DELETE FROM product_variants WHERE id = $1", [variantId])).rejects.toMatchObject(
          PERMISSION_DENIED,
        );
      });
    });

    it("no puede modificar movimientos de stock: solo insertar", async () => {
      await asRole("soleil_app", async (client) => {
        await expect(client.query("UPDATE stock_movements SET quantity = 999")).rejects.toMatchObject(
          PERMISSION_DENIED,
        );
      });
    });

    it("puede corregir el vencimiento de un lote, pero no su costo", async () => {
      await asRole("soleil_app", async (client) => {
        await client.query("UPDATE lots SET expires_on = CURRENT_DATE + 30 WHERE id = $1", [lotId]);
        await expect(
          client.query("UPDATE lots SET landed_unit_cost_bs = 1 WHERE id = $1", [lotId]),
        ).rejects.toMatchObject(PERMISSION_DENIED);
      });
    });

    it("puede borrar fotos de productos", async () => {
      await asRole("soleil_app", async (client) => {
        await expect(client.query("DELETE FROM product_images WHERE false")).resolves.toBeDefined();
      });
    });
  });
});
