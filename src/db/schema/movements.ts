import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { capitalMovements, expenses } from "./capital";
import { productVariants } from "./catalog";
import { createdAt, id, money } from "./columns";
import { moneyMovementTypeEnum, stockMovementTypeEnum } from "./enums";
import { inventoryCounts, lots, purchases } from "./inventory";
import { moneyAccounts } from "./money";
import { saleItems, sales } from "./sales";
import { adminUsers } from "./settings";

/**
 * Movimientos de stock (§3.3, §4.1). El stock **no se guarda**: es la suma de
 * estos movimientos. Solo se insertan; una anulación inserta el movimiento
 * inverso. El signo de la cantidad debe corresponder al tipo.
 */
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: id(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lots.id),
    quantity: integer("quantity").notNull(),
    type: stockMovementTypeEnum("type").notNull(),
    purchaseId: uuid("purchase_id").references(() => purchases.id),
    saleItemId: uuid("sale_item_id").references(() => saleItems.id),
    countId: uuid("count_id").references(() => inventoryCounts.id),
    reason: text("reason"),
    createdBy: uuid("created_by").references(() => adminUsers.id),
    createdAt: createdAt(),
  },
  (table) => [
    index("stock_movements_variant_id_idx").on(table.variantId),
    index("stock_movements_lot_id_idx").on(table.lotId),
    check("stock_movements_quantity_not_zero", sql`${table.quantity} <> 0`),
    check(
      "stock_movements_sign_matches_type",
      sql`CASE
        WHEN ${table.type} IN ('initial', 'purchase', 'sale_void') THEN ${table.quantity} > 0
        WHEN ${table.type} IN ('sale', 'purchase_void', 'expired', 'damaged', 'sample', 'supplier_return') THEN ${table.quantity} < 0
        ELSE TRUE
      END`,
    ),
    check(
      "stock_movements_sale_reference",
      sql`(${table.type} IN ('sale', 'sale_void')) = (${table.saleItemId} IS NOT NULL)`,
    ),
  ],
);

/**
 * Movimientos de dinero de Caja y Banco (§3.5, §4.11). El saldo de cada
 * cuenta es la suma de estos movimientos. Solo se insertan.
 */
export const moneyMovements = pgTable(
  "money_movements",
  {
    id: id(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => moneyAccounts.id),
    amountBs: money("amount_bs").notNull(),
    type: moneyMovementTypeEnum("type").notNull(),
    saleId: uuid("sale_id").references(() => sales.id),
    purchaseId: uuid("purchase_id").references(() => purchases.id),
    expenseId: uuid("expense_id").references(() => expenses.id),
    capitalMovementId: uuid("capital_movement_id").references(() => capitalMovements.id),
    transferId: uuid("transfer_id"),
    note: text("note"),
    createdBy: uuid("created_by").references(() => adminUsers.id),
    createdAt: createdAt(),
  },
  (table) => [
    index("money_movements_account_id_idx").on(table.accountId),
    check("money_movements_amount_not_zero", sql`${table.amountBs} <> 0`),
    check(
      "money_movements_sign_matches_type",
      sql`CASE
        WHEN ${table.type} IN ('sale', 'purchase_void', 'capital_in', 'expense_void') THEN ${table.amountBs} > 0
        WHEN ${table.type} IN ('sale_void', 'purchase', 'capital_out', 'profit_out', 'expense') THEN ${table.amountBs} < 0
        ELSE TRUE
      END`,
    ),
    check("money_movements_transfer_reference", sql`(${table.type} = 'transfer') = (${table.transferId} IS NOT NULL)`),
  ],
);
