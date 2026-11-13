import { sql } from "drizzle-orm";
import { boolean, check, numeric, pgTable, smallint, text, uuid } from "drizzle-orm/pg-core";

import { createdAt, id, money, timestampTz } from "./columns";
import { moneyAccountKindEnum } from "./enums";
import { adminUsers } from "./settings";

/** Cuentas de dinero: por ahora Caja (efectivo) y Banco (§3.5). */
export const moneyAccounts = pgTable("money_accounts", {
  id: id(),
  name: text("name").notNull().unique(),
  kind: moneyAccountKindEnum("kind").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

/** Socias de la tienda (§3.6). */
export const partners = pgTable(
  "partners",
  {
    id: id(),
    name: text("name").notNull().unique(),
    active: boolean("active").notNull().default(true),
    sharePctOverride: numeric("share_pct_override", { precision: 5, scale: 2 }),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      "partners_share_pct_range",
      sql`${table.sharePctOverride} IS NULL OR (${table.sharePctOverride} >= 0 AND ${table.sharePctOverride} <= 100)`,
    ),
  ],
);

/** Cierres de caja opcionales (§4.11). La diferencia la calcula la base. */
export const cashClosings = pgTable("cash_closings", {
  id: id(),
  closedAt: timestampTz("closed_at").notNull().defaultNow(),
  expectedBs: money("expected_bs").notNull(),
  countedBs: money("counted_bs").notNull(),
  differenceBs: money("difference_bs").generatedAlwaysAs(sql`counted_bs - expected_bs`),
  note: text("note"),
  createdBy: uuid("created_by").references(() => adminUsers.id),
});

/** Categorías de gastos (por ahora: Alquiler). */
export const expenseCategories = pgTable("expense_categories", {
  id: id(),
  name: text("name").notNull().unique(),
  active: boolean("active").notNull().default(true),
});

/** Plantillas de gastos mensuales (§4.14). */
export const recurringExpenses = pgTable(
  "recurring_expenses",
  {
    id: id(),
    name: text("name").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => expenseCategories.id),
    amountBs: money("amount_bs").notNull(),
    dayOfMonth: smallint("day_of_month").notNull(),
    description: text("description"),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (table) => [
    check("recurring_expenses_amount_positive", sql`${table.amountBs} > 0`),
    check("recurring_expenses_day_range", sql`${table.dayOfMonth} BETWEEN 1 AND 28`),
  ],
);
