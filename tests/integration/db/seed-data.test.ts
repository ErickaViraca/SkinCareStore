import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type TestDatabase, createTestDatabase } from "../../helpers/pglite";

describe("migraciones y datos iniciales", () => {
  let t: TestDatabase;

  beforeAll(async () => {
    t = await createTestDatabase();
  });

  afterAll(async () => {
    await t.close();
  });

  it("crea la configuración con margen 25%, stock mínimo 2 y escalones 6/3/2 meses", async () => {
    const { rows } = await t.client.query<{
      store_name: string;
      default_margin_pct: string;
      default_min_stock: number;
      expiry_tiers: unknown;
    }>("SELECT store_name, default_margin_pct, default_min_stock, expiry_tiers FROM settings");

    expect(rows).toEqual([
      {
        store_name: "Soleil",
        default_margin_pct: "25.00",
        default_min_stock: 2,
        expiry_tiers: [
          { months: 6, discountPct: 10 },
          { months: 3, discountPct: 25 },
          { months: 2, discountPct: 50 },
        ],
      },
    ]);
  });

  it("no permite una segunda fila de configuración", async () => {
    await expect(
      t.client.query("INSERT INTO settings (id, store_name, expiry_tiers) VALUES (2, 'Otra', '[]')"),
    ).rejects.toThrow(/settings_single_row/);
  });

  it("crea las cuentas Caja y Banco", async () => {
    const { rows } = await t.client.query("SELECT name, kind FROM money_accounts ORDER BY name");

    expect(rows).toEqual([
      { name: "Banco", kind: "bank" },
      { name: "Caja", kind: "cash" },
    ]);
  });

  it("crea a las socias Vanessa y Ericka, sin capital cargado", async () => {
    const { rows } = await t.client.query("SELECT name, capital_balance_bs FROM v_partner_capital ORDER BY name");

    expect(rows).toEqual([
      { name: "Ericka", capital_balance_bs: "0.00" },
      { name: "Vanessa", capital_balance_bs: "0.00" },
    ]);
  });

  it("crea la categoría de gasto Alquiler", async () => {
    const { rows } = await t.client.query("SELECT name FROM expense_categories");

    expect(rows).toEqual([{ name: "Alquiler" }]);
  });

  it("crea los usuarios de base de datos del panel y de la web", async () => {
    const { rows } = await t.client.query(
      "SELECT rolname FROM pg_roles WHERE rolname IN ('soleil_app', 'soleil_web') ORDER BY rolname",
    );

    expect(rows).toEqual([{ rolname: "soleil_app" }, { rolname: "soleil_web" }]);
  });
});
