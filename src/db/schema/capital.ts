import { sql } from "drizzle-orm";
import { check, date, index, numeric, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

import { createdAt, id, money, timestampTz } from "./columns";
import { capitalMovementTypeEnum, recordStatusEnum } from "./enums";
import { purchases } from "./inventory";
import { expenseCategories, moneyAccounts, partners, recurringExpenses } from "./money";
import { adminUsers } from "./settings";

/** Repartos de ganancias (§4.13): cuánto se repartió y cuánto quedó como reinversión. */
export const profitDistributions = pgTable(
  "profit_distributions",
  {
    id: id(),
    periodFrom: date("period_from").notNull(),
    periodTo: date("period_to").notNull(),
    netProfitAvailableBs: money("net_profit_available_bs").notNull(),
    distributedBs: money("distributed_bs").notNull(),
    reinvestedBs: money("reinvested_bs").notNull(),
    createdBy: uuid("created_by").references(() => adminUsers.id),
    createdAt: createdAt(),
  },
  (table) => [
    check("profit_distributions_period_order", sql`${table.periodFrom} <= ${table.periodTo}`),
    check("profit_distributions_distributed_non_negative", sql`${table.distributedBs} >= 0`),
    check("profit_distributions_reinvested_non_negative", sql`${table.reinvestedBs} >= 0`),
    check(
      "profit_distributions_parts_add_up",
      sql`${table.distributedBs} + ${table.reinvestedBs} = ${table.netProfitAvailableBs}`,
    ),
  ],
);

/** Lo que le tocó a cada socia en un reparto, con el porcentaje de ese momento. */
export const profitDistributionLines = pgTable(
  "profit_distribution_lines",
  {
    id: id(),
    distributionId: uuid("distribution_id")
      .notNull()
      .references(() => profitDistributions.id),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id),
    sharePct: numeric("share_pct", { precision: 5, scale: 2 }).notNull(),
    amountBs: money("amount_bs").notNull(),
  },
  (table) => [
    unique("profit_distribution_lines_partner_unique").on(table.distributionId, table.partnerId),
    check("profit_distribution_lines_share_range", sql`${table.sharePct} >= 0 AND ${table.sharePct} <= 100`),
    check("profit_distribution_lines_amount_non_negative", sql`${table.amountBs} >= 0`),
  ],
);

/**
 * Movimientos de capital de las socias (§3.6): aportes, retiros de capital y
 * retiros de ganancias. Se anulan con `status`, nunca se borran.
 */
export const capitalMovements = pgTable(
  "capital_movements",
  {
    id: id(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id),
    type: capitalMovementTypeEnum("type").notNull(),
    amountBs: money("amount_bs").notNull(),
    movedAt: timestampTz("moved_at").notNull().defaultNow(),
    accountId: uuid("account_id").references(() => moneyAccounts.id),
    purchaseId: uuid("purchase_id").references(() => purchases.id),
    distributionId: uuid("distribution_id").references(() => profitDistributions.id),
    note: text("note"),
    status: recordStatusEnum("status").notNull().default("active"),
    voidedAt: timestampTz("voided_at"),
    createdBy: uuid("created_by").references(() => adminUsers.id),
    createdAt: createdAt(),
  },
  (table) => [
    index("capital_movements_partner_id_idx").on(table.partnerId),
    check("capital_movements_amount_positive", sql`${table.amountBs} > 0`),
    check("capital_movements_void_consistency", sql`(${table.status} = 'voided') = (${table.voidedAt} IS NOT NULL)`),
    // Un aporte viene de una cuenta o del pago de una compra; un retiro siempre sale de una cuenta.
    check(
      "capital_movements_origin",
      sql`(${table.type} = 'contribution' AND (${table.accountId} IS NOT NULL OR ${table.purchaseId} IS NOT NULL))
       OR (${table.type} <> 'contribution' AND ${table.accountId} IS NOT NULL AND ${table.purchaseId} IS NULL)`,
    ),
    check(
      "capital_movements_profit_withdrawal_has_distribution",
      sql`(${table.type} = 'profit_withdrawal') = (${table.distributionId} IS NOT NULL)`,
    ),
  ],
);

/** Gastos del negocio (§4.14). Se anulan, no se borran. */
export const expenses = pgTable(
  "expenses",
  {
    id: id(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => expenseCategories.id),
    recurringExpenseId: uuid("recurring_expense_id").references(() => recurringExpenses.id),
    spentOn: date("spent_on").notNull(),
    amountBs: money("amount_bs").notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => moneyAccounts.id),
    description: text("description"),
    status: recordStatusEnum("status").notNull().default("active"),
    voidedAt: timestampTz("voided_at"),
    createdBy: uuid("created_by").references(() => adminUsers.id),
    createdAt: createdAt(),
  },
  (table) => [
    index("expenses_spent_on_idx").on(table.spentOn),
    check("expenses_amount_positive", sql`${table.amountBs} > 0`),
    check("expenses_void_consistency", sql`(${table.status} = 'voided') = (${table.voidedAt} IS NOT NULL)`),
  ],
);
