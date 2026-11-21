import "server-only";

import { and, asc, count, eq, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { type Database } from "@/db/client";
import { categories, products } from "@/db/schema";
import { createLogger } from "@/server/logger/logger";

import { firstOrThrow, withDatabaseErrors } from "./database-errors";

/** Acceso a la tabla `categories`. Patrón: **Repositorio / DAO**. No hay borrado: se archiva. */

const logger = createLogger("repository:categories");

export interface CategoryRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly parentId: string | null;
  readonly archivedAt: Date | null;
}

export interface CategoryListRow extends CategoryRow {
  readonly parentName: string | null;
  readonly productCount: number;
}

const columns = {
  id: categories.id,
  name: categories.name,
  slug: categories.slug,
  parentId: categories.parentId,
  archivedAt: categories.archivedAt,
};

const CONFLICT = "Ya existe una categoría con ese nombre (o uno muy parecido).";

const run = <T>(operation: string, query: () => Promise<T>): Promise<T> =>
  withDatabaseErrors({ logger, table: "categories", operation, conflictMessage: CONFLICT }, query);

/** Todas las categorías con el nombre de su padre y cuántos productos las usan, por nombre. */
export function listCategoriesWithProductCount(db: Database): Promise<CategoryListRow[]> {
  const parent = alias(categories, "parent");
  return run("list", () =>
    db
      .select({ ...columns, parentName: parent.name, productCount: count(products.id) })
      .from(categories)
      .leftJoin(parent, eq(parent.id, categories.parentId))
      .leftJoin(products, eq(products.categoryId, categories.id))
      .groupBy(categories.id, parent.name)
      .orderBy(asc(categories.name)),
  );
}

export async function findCategoryById(db: Database, id: string): Promise<CategoryRow | null> {
  const rows = await run("findById", () => db.select(columns).from(categories).where(eq(categories.id, id)).limit(1));
  return rows[0] ?? null;
}

/** Cuántas subcategorías tiene una categoría (con `onlyActive`, solo las no archivadas). */
export async function countSubcategories(db: Database, parentId: string, onlyActive: boolean): Promise<number> {
  const condition = onlyActive
    ? and(eq(categories.parentId, parentId), isNull(categories.archivedAt))
    : eq(categories.parentId, parentId);
  const rows = await run("countSubcategories", () => db.select({ total: count() }).from(categories).where(condition));
  return rows[0]?.total ?? 0;
}

export async function insertCategory(
  db: Database,
  values: { name: string; slug: string; parentId: string | null },
): Promise<CategoryRow> {
  const rows = await run("insert", () => db.insert(categories).values(values).returning(columns));
  return firstOrThrow(rows, "categories");
}

export async function updateCategory(
  db: Database,
  id: string,
  values: { name: string; slug: string; parentId: string | null },
): Promise<CategoryRow | null> {
  const rows = await run("update", () =>
    db
      .update(categories)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning(columns),
  );
  return rows[0] ?? null;
}

/** Archiva (con fecha) o reactiva (`null`) una categoría. */
export async function setCategoryArchivedAt(
  db: Database,
  id: string,
  archivedAt: Date | null,
): Promise<CategoryRow | null> {
  const rows = await run("setArchivedAt", () =>
    db.update(categories).set({ archivedAt, updatedAt: new Date() }).where(eq(categories.id, id)).returning(columns),
  );
  return rows[0] ?? null;
}
