import "server-only";

import { and, asc, count, eq, isNull, min, ne, sql } from "drizzle-orm";

import { type Database } from "@/db/client";
import { brands, categories, productImages, productVariants, products } from "@/db/schema";
import { createLogger } from "@/server/logger/logger";

import { firstOrThrow, withDatabaseErrors } from "./database-errors";

/** Acceso a la tabla `products`. Patrón: **Repositorio / DAO**. No hay borrado: se archiva. */

const logger = createLogger("repository:products");

const run = <T>(operation: string, query: () => Promise<T>): Promise<T> =>
  withDatabaseErrors(
    { logger, table: "products", operation, conflictMessage: "Ya existe un producto con ese nombre." },
    query,
  );

/** Datos editables de un producto. */
export interface ProductValues {
  readonly name: string;
  readonly slug: string;
  readonly brandId: string;
  readonly categoryId: string;
  readonly description: string;
  readonly usageInstructions: string | null;
  readonly skinTypes: readonly string[];
  readonly published: boolean;
  readonly featured: boolean;
  readonly comingSoon: boolean;
}

export interface ProductRow extends ProductValues {
  readonly id: string;
  readonly archivedAt: Date | null;
}

/** Fila de la lista de productos, con lo que muestra la tabla. */
export interface ProductListRow {
  readonly id: string;
  readonly name: string;
  readonly brandName: string;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly published: boolean;
  readonly comingSoon: boolean;
  readonly archivedAt: Date | null;
  readonly variantCount: number;
  /** Precio más bajo entre las variantes activas ("desde"), en el formato de la base. */
  readonly priceFromBs: string | null;
  /** Códigos, tonos y tamaños de las variantes, para el buscador. */
  readonly variantSearchText: string;
  /** Foto principal (la primera), si tiene. */
  readonly thumbnailUrl: string | null;
}

const columns = {
  id: products.id,
  name: products.name,
  slug: products.slug,
  brandId: products.brandId,
  categoryId: products.categoryId,
  description: products.description,
  usageInstructions: products.usageInstructions,
  skinTypes: products.skinTypes,
  published: products.published,
  featured: products.featured,
  comingSoon: products.comingSoon,
  archivedAt: products.archivedAt,
};

/** Todos los productos (activos y archivados), por nombre, con un resumen de sus variantes activas. */
export function listProductsForPanel(db: Database): Promise<ProductListRow[]> {
  const activeVariant = and(eq(productVariants.productId, products.id), isNull(productVariants.archivedAt));
  return run("list", () =>
    db
      .select({
        id: products.id,
        name: products.name,
        brandName: brands.name,
        categoryId: products.categoryId,
        categoryName: categories.name,
        published: products.published,
        comingSoon: products.comingSoon,
        archivedAt: products.archivedAt,
        variantCount: count(productVariants.id),
        priceFromBs: min(productVariants.salePriceBs),
        thumbnailUrl: sql<
          string | null
        >`(select ${productImages.url} from ${productImages} where ${productImages.productId} = ${products.id} order by ${productImages.sortOrder}, ${productImages.createdAt} limit 1)`,
        variantSearchText: sql<string>`coalesce(string_agg(concat_ws(' ', ${productVariants.sku}, ${productVariants.shade}, ${productVariants.presentation}, ${productVariants.barcode}), ' '), '')`,
      })
      .from(products)
      .innerJoin(brands, eq(brands.id, products.brandId))
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .leftJoin(productVariants, activeVariant)
      .groupBy(products.id, brands.name, categories.name)
      .orderBy(asc(products.name)),
  );
}

export async function findProductById(db: Database, id: string): Promise<ProductRow | null> {
  const rows = await run("findById", () => db.select(columns).from(products).where(eq(products.id, id)).limit(1));
  return rows[0] ?? null;
}

/** ¿Hay otro producto con ese slug? (`exceptId` excluye al que se está editando). */
export async function isProductSlugTaken(db: Database, slug: string, exceptId?: string): Promise<boolean> {
  const condition = exceptId ? and(eq(products.slug, slug), ne(products.id, exceptId)) : eq(products.slug, slug);
  const rows = await run("isSlugTaken", () => db.select({ id: products.id }).from(products).where(condition).limit(1));
  return rows.length > 0;
}

export async function insertProduct(db: Database, values: ProductValues): Promise<ProductRow> {
  const rows = await run("insert", () =>
    db
      .insert(products)
      .values({ ...values, skinTypes: [...values.skinTypes] })
      .returning(columns),
  );
  return firstOrThrow(rows, "products");
}

export async function updateProduct(db: Database, id: string, values: ProductValues): Promise<ProductRow | null> {
  const rows = await run("update", () =>
    db
      .update(products)
      .set({ ...values, skinTypes: [...values.skinTypes], updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning(columns),
  );
  return rows[0] ?? null;
}

/** Archiva (con fecha) o reactiva (`null`) un producto. */
export async function setProductArchivedAt(
  db: Database,
  id: string,
  archivedAt: Date | null,
): Promise<ProductRow | null> {
  const rows = await run("setArchivedAt", () =>
    db.update(products).set({ archivedAt, updatedAt: new Date() }).where(eq(products.id, id)).returning(columns),
  );
  return rows[0] ?? null;
}
