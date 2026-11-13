import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestDatabase } from "../helpers/pglite";

import type { PGlite } from "@electric-sql/pglite";

/**
 * Verifica que la base de tests en memoria funciona como un Postgres real:
 * tablas, restricciones y transacciones. Cada test usa una base nueva.
 */
describe("PGlite (base de tests en memoria)", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createTestDatabase();
    await db.exec("CREATE TABLE prueba (id serial PRIMARY KEY, cantidad integer NOT NULL CHECK (cantidad > 0))");
  });

  afterEach(async () => {
    await db.close();
  });

  it("guarda y lee datos", async () => {
    await db.query("INSERT INTO prueba (cantidad) VALUES ($1)", [3]);
    const { rows } = await db.query<{ cantidad: number }>("SELECT cantidad FROM prueba");

    expect(rows).toEqual([{ cantidad: 3 }]);
  });

  it("aplica las restricciones CHECK", async () => {
    await expect(db.query("INSERT INTO prueba (cantidad) VALUES (-1)")).rejects.toThrow(/check constraint/i);
  });

  it("revierte una transacción completa si algo falla", async () => {
    await expect(
      db.transaction(async (tx) => {
        await tx.query("INSERT INTO prueba (cantidad) VALUES (5)");
        await tx.query("INSERT INTO prueba (cantidad) VALUES (0)");
      }),
    ).rejects.toThrow();

    const { rows } = await db.query("SELECT * FROM prueba");
    expect(rows).toHaveLength(0);
  });
});
