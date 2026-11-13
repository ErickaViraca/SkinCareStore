import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { productVariants } from "./catalog";
import { createdAt, id, money, timestampTz } from "./columns";
import { paymentMethodEnum, saleChannelEnum, saleStatusEnum } from "./enums";
import { lots } from "./inventory";
import { moneyAccounts } from "./money";
import { adminUsers } from "./settings";

/** Ventas (§3.4). Se anulan, no se borran. El número de venta es correlativo. */
export const sales = pgTable(
  "sales",
  {
    id: id(),
    saleNumber: integer("sale_number").generatedAlwaysAsIdentity().notNull().unique(),
    soldAt: timestampTz("sold_at").notNull().defaultNow(),
    channel: saleChannelEnum("channel").notNull(),
    customerName: text("customer_name"),
    customerPhone: text("customer_phone"),
    totalBs: money("total_bs").notNull(),
    status: saleStatusEnum("status").notNull().default("completed"),
    voidReason: text("void_reason"),
    voidedAt: timestampTz("voided_at"),
    createdBy: uuid("created_by").references(() => adminUsers.id),
    createdAt: createdAt(),
  },
  (table) => [
    index("sales_sold_at_idx").on(table.soldAt),
    check("sales_total_non_negative", sql`${table.totalBs} >= 0`),
    check("sales_void_consistency", sql`(${table.status} = 'voided') = (${table.voidedAt} IS NOT NULL)`),
  ],
);

/**
 * Ítems de una venta: una línea por lote vendido (§3.4), con el costo real
 * del lote para calcular la utilidad exacta.
 */
export const saleItems = pgTable(
  "sale_items",
  {
    id: id(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lots.id),
    quantity: integer("quantity").notNull(),
    listPriceBs: money("list_price_bs").notNull(),
    unitPriceBs: money("unit_price_bs").notNull(),
    isOffer: boolean("is_offer").notNull().default(false),
    unitCostBs: money("unit_cost_bs").notNull(),
  },
  (table) => [
    index("sale_items_sale_id_idx").on(table.saleId),
    index("sale_items_variant_id_idx").on(table.variantId),
    check("sale_items_quantity_positive", sql`${table.quantity} > 0`),
    check("sale_items_list_price_non_negative", sql`${table.listPriceBs} >= 0`),
    check("sale_items_unit_cost_non_negative", sql`${table.unitCostBs} >= 0`),
    // Regla fija §4.7: nunca se cobra menos que el costo real del lote.
    check("sale_items_price_not_below_cost", sql`${table.unitPriceBs} >= ${table.unitCostBs}`),
  ],
);

/** Pagos de una venta: puede haber varios medios en una misma venta (§4.9). */
export const salePayments = pgTable(
  "sale_payments",
  {
    id: id(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id),
    method: paymentMethodEnum("method").notNull(),
    amountBs: money("amount_bs").notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => moneyAccounts.id),
  },
  (table) => [
    index("sale_payments_sale_id_idx").on(table.saleId),
    check("sale_payments_amount_positive", sql`${table.amountBs} > 0`),
  ],
);
