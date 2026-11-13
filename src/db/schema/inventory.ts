import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

import { productVariants } from "./catalog";
import { createdAt, id, money, timestampTz, updatedAt } from "./columns";
import { inventoryCountStatusEnum, paymentSourceEnum, purchaseStatusEnum } from "./enums";
import { moneyAccounts, partners } from "./money";
import { adminUsers } from "./settings";

/** Proveedores (§3.3). */
export const suppliers = pgTable("suppliers", {
  id: id(),
  name: text("name").notNull(),
  city: text("city"),
  contactName: text("contact_name"),
  phone: text("phone"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Compras: cabecera con proveedor, factura y envío (§3.3). Se anulan, no se borran. */
export const purchases = pgTable(
  "purchases",
  {
    id: id(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    purchaseDate: date("purchase_date").notNull(),
    invoiceNumber: text("invoice_number"),
    invoiceFileKey: text("invoice_file_key"),
    shippingCostBs: money("shipping_cost_bs").notNull().default("0"),
    status: purchaseStatusEnum("status").notNull().default("registered"),
    notes: text("notes"),
    voidReason: text("void_reason"),
    voidedAt: timestampTz("voided_at"),
    createdBy: uuid("created_by").references(() => adminUsers.id),
    createdAt: createdAt(),
  },
  (table) => [
    index("purchases_supplier_id_idx").on(table.supplierId),
    check("purchases_shipping_non_negative", sql`${table.shippingCostBs} >= 0`),
    check("purchases_void_consistency", sql`(${table.status} = 'voided') = (${table.voidedAt} IS NOT NULL)`),
  ],
);

/**
 * Lotes: cada línea de una compra (§3.3). Guarda el costo real por unidad,
 * con el envío y los regalos ya repartidos (§4.2). Un lote de regalo de otro
 * producto (`is_gift`) tiene costo 0 (§4.3).
 */
export const lots = pgTable(
  "lots",
  {
    id: id(),
    purchaseId: uuid("purchase_id")
      .notNull()
      .references(() => purchases.id),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),
    quantity: integer("quantity").notNull(),
    freeQuantity: integer("free_quantity").notNull().default(0),
    isGift: boolean("is_gift").notNull().default(false),
    unitPriceBs: money("unit_price_bs").notNull(),
    landedUnitCostBs: money("landed_unit_cost_bs").notNull(),
    lotCode: text("lot_code"),
    expiresOn: date("expires_on"),
    createdAt: createdAt(),
  },
  (table) => [
    index("lots_purchase_id_idx").on(table.purchaseId),
    index("lots_variant_expiry_idx").on(table.variantId, table.expiresOn),
    check("lots_quantity_positive", sql`${table.quantity} > 0`),
    check("lots_free_quantity_non_negative", sql`${table.freeQuantity} >= 0`),
    check("lots_unit_price_non_negative", sql`${table.unitPriceBs} >= 0`),
    check("lots_landed_cost_non_negative", sql`${table.landedUnitCostBs} >= 0`),
    check(
      "lots_gift_has_zero_cost",
      sql`NOT ${table.isGift} OR (${table.unitPriceBs} = 0 AND ${table.landedUnitCostBs} = 0 AND ${table.freeQuantity} = 0)`,
    ),
  ],
);

/**
 * Cómo se pagó una compra: desde una cuenta de la tienda o por una socia
 * (§4.10). Una compra puede tener varias líneas de pago.
 */
export const purchasePayments = pgTable(
  "purchase_payments",
  {
    id: id(),
    purchaseId: uuid("purchase_id")
      .notNull()
      .references(() => purchases.id),
    source: paymentSourceEnum("source").notNull(),
    accountId: uuid("account_id").references(() => moneyAccounts.id),
    partnerId: uuid("partner_id").references(() => partners.id),
    amountBs: money("amount_bs").notNull(),
  },
  (table) => [
    index("purchase_payments_purchase_id_idx").on(table.purchaseId),
    check("purchase_payments_amount_positive", sql`${table.amountBs} > 0`),
    check(
      "purchase_payments_source_matches",
      sql`(${table.source} = 'account' AND ${table.accountId} IS NOT NULL AND ${table.partnerId} IS NULL)
       OR (${table.source} = 'partner' AND ${table.partnerId} IS NOT NULL AND ${table.accountId} IS NULL)`,
    ),
  ],
);

/** Cuadres: conteos físicos del inventario (§3.3). */
export const inventoryCounts = pgTable("inventory_counts", {
  id: id(),
  countedAt: timestampTz("counted_at").notNull().defaultNow(),
  status: inventoryCountStatusEnum("status").notNull().default("open"),
  notes: text("notes"),
  closedAt: timestampTz("closed_at"),
  createdBy: uuid("created_by").references(() => adminUsers.id),
});

/** Línea de un cuadre: cuánto debería haber y cuánto se contó. */
export const inventoryCountLines = pgTable(
  "inventory_count_lines",
  {
    id: id(),
    countId: uuid("count_id")
      .notNull()
      .references(() => inventoryCounts.id),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),
    expectedQty: integer("expected_qty").notNull(),
    countedQty: integer("counted_qty"),
  },
  (table) => [
    unique("inventory_count_lines_count_variant_unique").on(table.countId, table.variantId),
    check("inventory_count_lines_counted_non_negative", sql`${table.countedQty} IS NULL OR ${table.countedQty} >= 0`),
  ],
);
