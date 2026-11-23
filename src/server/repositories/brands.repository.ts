import "server-only";

import { asc, count, eq } from "drizzle-orm";

import { type Database } from "@/db/client";
import { brands, products } from "@/db/schema";
import { createLogger } from "@/server/logger/logger";

import { firstOrThrow, withDatabaseErrors } from "./database-errors";

/** Acceso a la tabla `brands`. Patrón: **Repositorio / DAO**. No hay borrado: se archiva. */

const logger = createLogger("repository:brands");

export interface BrandRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly archivedAt: Date | null;
}

export interface BrandListRow extends BrandRow {
  readonly productCount: number;
}

const columns = { id: brands.id, name: brands.name, slug: brands.slug, archivedAt: brands.archivedAt };

const CONFLICT = "Ya existe una marca con ese nombre (o uno muy parecido).";

const run = <T>(operation: string, query: () => Promise<T>): Promise<T> =>
  withDatabaseErrors({ logger, table: "brands", operation, conflictMessage: CONFLICT }, query);

/** Todas las marcas (activas y archivadas) con cuántos productos las usan, por nombre. */
export function listBrandsWithProductCount(db: Database): Promise<BrandListRow[]> {
  return run("list", () =>
    db
      .select({ ...columns, productCount: count(products.id) })
      .from(brands)
      .leftJoin(products, eq(products.brandId, brands.id))
      .groupBy(brands.id)
      .orderBy(asc(brands.name)),
  );
}

export async function findBrandById(db: Database, id: string): Promise<BrandRow | null> {
  const rows = await run("findById", () => db.select(columns).from(brands).where(eq(brands.id, id)).limit(1));
  return rows[0] ?? null;
}

export async function insertBrand(db: Database, values: { name: string; slug: string }): Promise<BrandRow> {
  const rows = await run("insert", () => db.insert(brands).values(values).returning(columns));
  return firstOrThrow(rows, "brands");
}

export async function updateBrandName(
  db: Database,
  id: string,
  values: { name: string; slug: string },
): Promise<BrandRow | null> {
  const rows = await run("update", () =>
    db
      .update(brands)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(brands.id, id))
      .returning(columns),
  );
  return rows[0] ?? null;
}

/** Archiva (con fecha) o reactiva (`null`) una marca. */
export async function setBrandArchivedAt(db: Database, id: string, archivedAt: Date | null): Promise<BrandRow | null> {
  const rows = await run("setArchivedAt", () =>
    db.update(brands).set({ archivedAt, updatedAt: new Date() }).where(eq(brands.id, id)).returning(columns),
  );
  return rows[0] ?? null;
}
