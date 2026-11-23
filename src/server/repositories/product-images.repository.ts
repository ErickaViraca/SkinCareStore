import "server-only";

import { asc, count, eq, max } from "drizzle-orm";

import { type Database } from "@/db/client";
import { productImages } from "@/db/schema";
import { createLogger } from "@/server/logger/logger";

import { firstOrThrow, withDatabaseErrors } from "./database-errors";

/**
 * Acceso a la tabla `product_images`. Patrón: **Repositorio / DAO**.
 * Es la única tabla donde el panel borra filas (la foto deja de existir).
 */

const logger = createLogger("repository:product-images");

const run = <T>(operation: string, query: () => Promise<T>): Promise<T> =>
  withDatabaseErrors(
    { logger, table: "product_images", operation, conflictMessage: "Esa foto ya está registrada." },
    query,
  );

export interface ProductImageRow {
  readonly id: string;
  readonly productId: string;
  readonly variantId: string | null;
  readonly url: string;
  readonly storageKey: string | null;
  readonly alt: string | null;
  readonly sortOrder: number;
}

const columns = {
  id: productImages.id,
  productId: productImages.productId,
  variantId: productImages.variantId,
  url: productImages.url,
  storageKey: productImages.storageKey,
  alt: productImages.alt,
  sortOrder: productImages.sortOrder,
};

/** Fotos de un producto en su orden (la primera es la principal). */
export function listProductImages(db: Database, productId: string): Promise<ProductImageRow[]> {
  return run("list", () =>
    db
      .select(columns)
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(asc(productImages.sortOrder), asc(productImages.createdAt)),
  );
}

export async function findProductImageById(db: Database, id: string): Promise<ProductImageRow | null> {
  const rows = await run("findById", () =>
    db.select(columns).from(productImages).where(eq(productImages.id, id)).limit(1),
  );
  return rows[0] ?? null;
}

/** Cantidad de fotos y el orden más alto, para agregar la siguiente al final. */
export async function imageStats(db: Database, productId: string): Promise<{ total: number; maxOrder: number }> {
  const rows = await run("stats", () =>
    db
      .select({ total: count(), maxOrder: max(productImages.sortOrder) })
      .from(productImages)
      .where(eq(productImages.productId, productId)),
  );
  return { total: rows[0]?.total ?? 0, maxOrder: rows[0]?.maxOrder ?? -1 };
}

export async function insertProductImage(db: Database, values: Omit<ProductImageRow, "id">): Promise<ProductImageRow> {
  const rows = await run("insert", () => db.insert(productImages).values(values).returning(columns));
  return firstOrThrow(rows, "product_images");
}

export async function setImageSortOrder(db: Database, id: string, sortOrder: number): Promise<void> {
  await run("setSortOrder", () => db.update(productImages).set({ sortOrder }).where(eq(productImages.id, id)));
}

export async function setImageVariant(db: Database, id: string, variantId: string | null): Promise<void> {
  await run("setVariant", () => db.update(productImages).set({ variantId }).where(eq(productImages.id, id)));
}

export async function deleteProductImage(db: Database, id: string): Promise<void> {
  await run("delete", () => db.delete(productImages).where(eq(productImages.id, id)));
}
