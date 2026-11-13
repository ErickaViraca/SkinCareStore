import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestPool, hasTestDatabase } from "../helpers/postgres";

import type { Pool } from "pg";

/**
 * Verifica que el Postgres de tests (contenedor) permite lo que PGlite no:
 * varias conexiones simultáneas y bloqueos entre transacciones. Es la base
 * de los futuros tests de "dos ventas de la última unidad al mismo tiempo".
 */
describe.skipIf(!hasTestDatabase)("Postgres real: conexiones simultáneas", () => {
  let pool: Pool;
  const schema = `smoke_${Date.now()}`;

  beforeAll(async () => {
    pool = createTestPool();
    await pool.query(`CREATE SCHEMA ${schema}`);
    await pool.query(`CREATE TABLE ${schema}.stock (id integer PRIMARY KEY, cantidad integer NOT NULL)`);
    await pool.query(`INSERT INTO ${schema}.stock VALUES (1, 1)`);
  });

  afterAll(async () => {
    await pool.query(`DROP SCHEMA ${schema} CASCADE`);
    await pool.end();
  });

  it("una fila bloqueada por una transacción no puede ser tomada por otra al mismo tiempo", async () => {
    const first = await pool.connect();
    const second = await pool.connect();
    try {
      await first.query("BEGIN");
      await first.query(`SELECT * FROM ${schema}.stock WHERE id = 1 FOR UPDATE`);

      await second.query("BEGIN");
      await expect(second.query(`SELECT * FROM ${schema}.stock WHERE id = 1 FOR UPDATE NOWAIT`)).rejects.toMatchObject({
        code: "55P03", // lock_not_available
      });
      await second.query("ROLLBACK");
      await first.query("ROLLBACK");
    } finally {
      first.release();
      second.release();
    }
  });
});
