import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Valores fijos que la base de datos acepta en ciertas columnas.
 * Cada enum corresponde a una lista de la especificación (docs/ESPECIFICACION.md §3).
 * Al usar enums de Postgres, la base rechaza cualquier valor fuera de la lista.
 */

/** Cómo se calcula el precio mínimo de una variante (§4.5). */
export const marginModeEnum = pgEnum("margin_mode", ["pct", "fixed", "max"]);

/** Estado de una compra: registrada o anulada. */
export const purchaseStatusEnum = pgEnum("purchase_status", ["registered", "voided"]);

/** Origen del dinero de una compra: cuenta de la tienda o socia (§4.10). */
export const paymentSourceEnum = pgEnum("payment_source", ["account", "partner"]);

/** Tipos de movimiento de stock (§3.3). */
export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "initial",
  "purchase",
  "purchase_void",
  "sale",
  "sale_void",
  "adjustment",
  "expired",
  "damaged",
  "sample",
  "supplier_return",
  "count",
]);

/** Canal de una venta (§3.4). */
export const saleChannelEnum = pgEnum("sale_channel", [
  "store",
  "whatsapp",
  "instagram",
  "facebook",
  "tiktok",
  "other",
]);

/** Estado de una venta. */
export const saleStatusEnum = pgEnum("sale_status", ["completed", "voided"]);

/** Medio de pago de una venta. No se aceptan tarjetas (§4.9). */
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "qr", "transfer"]);

/** Tipo de cuenta de dinero: caja (efectivo) o banco. */
export const moneyAccountKindEnum = pgEnum("money_account_kind", ["cash", "bank"]);

/** Tipos de movimiento de dinero (§3.5). */
export const moneyMovementTypeEnum = pgEnum("money_movement_type", [
  "sale",
  "sale_void",
  "purchase",
  "purchase_void",
  "transfer",
  "capital_in",
  "capital_out",
  "profit_out",
  "expense",
  "expense_void",
  "cash_adjustment",
]);

/** Tipos de movimiento de capital de las socias (§3.6). */
export const capitalMovementTypeEnum = pgEnum("capital_movement_type", [
  "contribution",
  "capital_withdrawal",
  "profit_withdrawal",
]);

/** Estado de registros que se anulan en vez de borrarse (capital, gastos). */
export const recordStatusEnum = pgEnum("record_status", ["active", "voided"]);

/** Estado de un cuadre (conteo físico). */
export const inventoryCountStatusEnum = pgEnum("inventory_count_status", ["open", "closed"]);

/** Motivo de un cambio de precio (§3.2). */
export const priceChangeReasonEnum = pgEnum("price_change_reason", ["manual", "auto_cost"]);
