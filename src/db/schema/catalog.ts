import { sql } from "drizzle-orm";
import { type AnyPgColumn, boolean, check, index, integer, numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { createdAt, id, money, timestampTz, updatedAt } from "./columns";
import { marginModeEnum, priceChangeReasonEnum } from "./enums";
import { adminUsers } from "./settings";

/** Marcas (§3.2). Se archivan, nunca se borran. */
export const brands = pgTable("brands", {
  id: id(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  archivedAt: timestampTz("archived_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Categorías, con subcategorías opcionales (§3.2). */
export const categories = pgTable(
  "categories",
  {
    id: id(),
    name: text("name").notNull().unique(),
    slug: text("slug").notNull().unique(),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id),
    archivedAt: timestampTz("archived_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [check("categories_not_own_parent", sql`${table.parentId} IS NULL OR ${table.parentId} <> ${table.id}`)],
);

/** Productos: lo común a todas sus variantes (§3.2). */
export const products = pgTable(
  "products",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    description: text("description").notNull().default(""),
    usageInstructions: text("usage_instructions"),
    skinTypes: text("skin_types")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    published: boolean("published").notNull().default(false),
    featured: boolean("featured").notNull().default(false),
    // "Disponible pronto": casilla manual. Sin stock, la página pública muestra
    // "Disponible pronto" en vez de "Agotado". El sistema nunca la cambia solo.
    comingSoon: boolean("coming_soon").notNull().default(false),
    archivedAt: timestampTz("archived_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("products_brand_id_idx").on(table.brandId),
    index("products_category_id_idx").on(table.categoryId),
    // Solo los códigos de la lista fija (src/domain/skin-types.ts).
    check(
      "products_skin_types_known",
      sql`${table.skinTypes} <@ ARRAY['oily', 'dry', 'combination', 'sensitive', 'acne_prone', 'hyperpigmentation', 'mature', 'all']::text[]`,
    ),
  ],
);

/** Variantes: lo que se vende y se cuenta, con su tono, tamaño y precio (§3.2). */
export const productVariants = pgTable(
  "product_variants",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    sku: text("sku").notNull().unique(),
    barcode: text("barcode"),
    shade: text("shade"),
    presentation: text("presentation"),
    salePriceBs: money("sale_price_bs").notNull(),
    minStock: integer("min_stock"),
    marginMode: marginModeEnum("margin_mode"),
    marginPct: numeric("margin_pct", { precision: 6, scale: 2 }),
    marginFixedBs: money("margin_fixed_bs"),
    priceAutoRaisedAt: timestampTz("price_auto_raised_at"),
    published: boolean("published").notNull().default(true),
    archivedAt: timestampTz("archived_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("product_variants_product_id_idx").on(table.productId),
    check("product_variants_sale_price_non_negative", sql`${table.salePriceBs} >= 0`),
    check("product_variants_min_stock_non_negative", sql`${table.minStock} IS NULL OR ${table.minStock} >= 0`),
    check("product_variants_margin_pct_non_negative", sql`${table.marginPct} IS NULL OR ${table.marginPct} >= 0`),
    check(
      "product_variants_margin_fixed_non_negative",
      sql`${table.marginFixedBs} IS NULL OR ${table.marginFixedBs} >= 0`,
    ),
    // Los modos "fijo" y "el mayor" necesitan un monto fijo (§4.5).
    check(
      "product_variants_fixed_margin_required",
      sql`${table.marginMode} IS NULL OR ${table.marginMode} = 'pct' OR ${table.marginFixedBs} IS NOT NULL`,
    ),
  ],
);

/** Fotos de un producto; opcionalmente asociadas a una variante (por ejemplo, un tono). */
export const productImages = pgTable(
  "product_images",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    variantId: uuid("variant_id").references(() => productVariants.id),
    url: text("url").notNull(),
    // Ruta del archivo en R2 ("products/<id>/<uuid>.webp"). Sirve para borrarlo y
    // para rehacer la URL si cambia el dominio de las fotos (etapa 8).
    storageKey: text("storage_key"),
    alt: text("alt"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (table) => [index("product_images_product_id_idx").on(table.productId)],
);

/** Historial de cambios de precio. Solo se inserta, nunca se modifica. */
export const priceChanges = pgTable(
  "price_changes",
  {
    id: id(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),
    oldPriceBs: money("old_price_bs").notNull(),
    newPriceBs: money("new_price_bs").notNull(),
    reason: priceChangeReasonEnum("reason").notNull(),
    createdBy: uuid("created_by").references(() => adminUsers.id),
    createdAt: createdAt(),
  },
  (table) => [index("price_changes_variant_id_idx").on(table.variantId)],
);
