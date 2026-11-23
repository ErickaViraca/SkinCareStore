import { boolean, integer, numeric, pgView, uuid } from "drizzle-orm/pg-core";

/**
 * Vistas que ya existen en la base (creadas en las migraciones SQL 0001 y 0005).
 * Se declaran aquí con `.existing()` solo para poder consultarlas con tipos:
 * Drizzle Kit no las crea ni las modifica.
 */

/** Stock de cada variante: en mano, vendible (sin vencidos) y stock mínimo efectivo. */
export const variantStockView = pgView("v_variant_stock", {
  variantId: uuid("variant_id").notNull(),
  productId: uuid("product_id").notNull(),
  onHand: integer("on_hand").notNull(),
  sellable: integer("sellable").notNull(),
  minStockEffective: integer("min_stock_effective").notNull(),
  isLow: boolean("is_low").notNull(),
}).existing();

/** Costo promedio y precio mínimo de cada variante (§4.5). Vacíos si nunca hubo compras. */
export const variantPricingView = pgView("v_variant_pricing", {
  variantId: uuid("variant_id").notNull(),
  averageCostBs: numeric("average_cost_bs"),
  minimumPriceBs: numeric("minimum_price_bs"),
}).existing();
