import "server-only";

import { and, asc, count, eq, isNull, ne } from "drizzle-orm";

import { type Database } from "@/db/client";
import { productVariants, variantPricingView, variantStockView } from "@/db/schema";
import { createLogger } from "@/server/logger/logger";

import { firstOrThrow, withDatabaseErrors } from "./database-errors";

/**
 * Acceso a la tabla `product_variants`. Patrón: **Repositorio / DAO**.
 * No hay borrado: se archiva.
 */

const logger = createLogger("repository:variants");

const run = <T>(operation: string, query: () => Promise<T>): Promise<T> =>
  withDatabaseErrors(
    {
      logger,
      table: "product_variants",
      operation,
      conflictMessage: "Ese código (SKU) ya lo usa otra variante.",
      checkViolations: {
        // Regla en la base (migración 0005): el precio no puede quedar debajo del mínimo.
        product_variants_price_not_below_minimum: {
          field: "salePrice",
          message: "El precio no puede ser menor al precio mínimo de esta variante.",
        },
        product_variants_fixed_margin_required: {
          field: "marginFixed",
          message: "Este modo de margen necesita un monto fijo.",
        },
      },
    },
    query,
  );

/** Datos editables de una variante. Los montos van en el formato de la base ("289.90"). */
export interface VariantValues {
  readonly sku: string;
  readonly barcode: string | null;
  readonly shade: string | null;
  readonly presentation: string | null;
  readonly salePriceBs: string;
  readonly minStock: number | null;
  readonly marginMode: "pct" | "fixed" | "max" | null;
  readonly marginPct: string | null;
  readonly marginFixedBs: string | null;
  readonly published: boolean;
}

export interface VariantRow extends VariantValues {
  readonly id: string;
  readonly productId: string;
  readonly archivedAt: Date | null;
}

/** Variante con su stock y, si ya hubo compras, su costo promedio y precio mínimo. */
export interface VariantDetailRow extends VariantRow {
  readonly sellable: number;
  readonly averageCostBs: string | null;
  readonly minimumPriceBs: string | null;
}

const columns = {
  id: productVariants.id,
  productId: productVariants.productId,
  sku: productVariants.sku,
  barcode: productVariants.barcode,
  shade: productVariants.shade,
  presentation: productVariants.presentation,
  salePriceBs: productVariants.salePriceBs,
  minStock: productVariants.minStock,
  marginMode: productVariants.marginMode,
  marginPct: productVariants.marginPct,
  marginFixedBs: productVariants.marginFixedBs,
  published: productVariants.published,
  archivedAt: productVariants.archivedAt,
};

/** Variantes de un producto (activas primero, por fecha de creación). */
export function listVariantsWithStock(db: Database, productId: string): Promise<VariantDetailRow[]> {
  return run("listWithStock", () =>
    db
      .select({
        ...columns,
        sellable: variantStockView.sellable,
        averageCostBs: variantPricingView.averageCostBs,
        minimumPriceBs: variantPricingView.minimumPriceBs,
      })
      .from(productVariants)
      .innerJoin(variantStockView, eq(variantStockView.variantId, productVariants.id))
      .innerJoin(variantPricingView, eq(variantPricingView.variantId, productVariants.id))
      .where(eq(productVariants.productId, productId))
      .orderBy(asc(productVariants.createdAt), asc(productVariants.sku)),
  );
}

export async function findVariantById(db: Database, id: string): Promise<VariantRow | null> {
  const rows = await run("findById", () =>
    db.select(columns).from(productVariants).where(eq(productVariants.id, id)).limit(1),
  );
  return rows[0] ?? null;
}

/** ¿Otra variante usa ese código? (`exceptId` excluye a la que se está editando). */
export async function isSkuTaken(db: Database, sku: string, exceptId?: string): Promise<boolean> {
  const condition = exceptId
    ? and(eq(productVariants.sku, sku), ne(productVariants.id, exceptId))
    : eq(productVariants.sku, sku);
  const rows = await run("isSkuTaken", () =>
    db.select({ id: productVariants.id }).from(productVariants).where(condition).limit(1),
  );
  return rows.length > 0;
}

/** Cuántas variantes activas (no archivadas) tiene un producto. */
export async function countActiveVariants(db: Database, productId: string): Promise<number> {
  const rows = await run("countActive", () =>
    db
      .select({ total: count() })
      .from(productVariants)
      .where(and(eq(productVariants.productId, productId), isNull(productVariants.archivedAt))),
  );
  return rows[0]?.total ?? 0;
}

export async function insertVariant(db: Database, productId: string, values: VariantValues): Promise<VariantRow> {
  const rows = await run("insert", () =>
    db
      .insert(productVariants)
      .values({ ...values, productId })
      .returning(columns),
  );
  return firstOrThrow(rows, "product_variants");
}

export async function updateVariant(db: Database, id: string, values: VariantValues): Promise<VariantRow | null> {
  const rows = await run("update", () =>
    db
      .update(productVariants)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(productVariants.id, id))
      .returning(columns),
  );
  return rows[0] ?? null;
}

/** Archiva (con fecha) o reactiva (`null`) una variante. */
export async function setVariantArchivedAt(
  db: Database,
  id: string,
  archivedAt: Date | null,
): Promise<VariantRow | null> {
  const rows = await run("setArchivedAt", () =>
    db
      .update(productVariants)
      .set({ archivedAt, updatedAt: new Date() })
      .where(eq(productVariants.id, id))
      .returning(columns),
  );
  return rows[0] ?? null;
}
