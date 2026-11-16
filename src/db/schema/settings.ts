import { sql } from "drizzle-orm";
import { boolean, check, integer, jsonb, numeric, pgTable, smallint, text, uuid } from "drizzle-orm/pg-core";

import { createdAt, updatedAt } from "./columns";

/** Escalón de vencimiento: a cuántos meses de vencer se aplica qué descuento sobre la ganancia (§4.8). */
export interface ExpiryTier {
  readonly months: number;
  readonly discountPct: number;
}

/** Dirección de la tienda con su enlace de mapa. */
export interface StoreAddress {
  readonly address: string;
  readonly mapsUrl: string;
}

/**
 * Configuración de la tienda (§3.1). Tabla de **una sola fila**: la
 * restricción `settings_single_row` impide crear una segunda.
 */
export const settings = pgTable(
  "settings",
  {
    id: smallint("id").primaryKey().default(1),
    storeName: text("store_name").notNull(),
    phones: jsonb("phones").$type<string[]>().notNull().default([]),
    addresses: jsonb("addresses").$type<StoreAddress[]>().notNull().default([]),
    whatsappUrl: text("whatsapp_url"),
    instagramUrl: text("instagram_url"),
    facebookUrl: text("facebook_url"),
    tiktokUrl: text("tiktok_url"),
    // Identidad visual (§4.17): logo y colores editables desde Configuración.
    logoUrl: text("logo_url"),
    colorBackground: text("color_background").notNull().default("#FAF6E3"),
    colorNav: text("color_nav").notNull().default("#0E2D06"),
    colorPrimary: text("color_primary").notNull().default("#D6D22E"),
    colorSecondary: text("color_secondary").notNull().default("#4A7A24"),
    colorAccent: text("color_accent").notNull().default("#839A2D"),
    colorDanger: text("color_danger").notNull().default("#C62828"),
    colorText: text("color_text").notNull().default("#1C1C1A"),
    defaultMarginPct: numeric("default_margin_pct", { precision: 6, scale: 2 }).notNull().default("25"),
    defaultMinStock: integer("default_min_stock").notNull().default(2),
    expiryTiers: jsonb("expiry_tiers").$type<ExpiryTier[]>().notNull(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("settings_single_row", sql`${table.id} = 1`),
    check("settings_default_margin_non_negative", sql`${table.defaultMarginPct} >= 0`),
    check("settings_default_min_stock_non_negative", sql`${table.defaultMinStock} >= 0`),
    check(
      "settings_colors_are_hex",
      sql`${table.colorBackground} ~ '^#[0-9A-Fa-f]{6}$' AND ${table.colorNav} ~ '^#[0-9A-Fa-f]{6}$'
        AND ${table.colorPrimary} ~ '^#[0-9A-Fa-f]{6}$' AND ${table.colorSecondary} ~ '^#[0-9A-Fa-f]{6}$'
        AND ${table.colorAccent} ~ '^#[0-9A-Fa-f]{6}$' AND ${table.colorDanger} ~ '^#[0-9A-Fa-f]{6}$'
        AND ${table.colorText} ~ '^#[0-9A-Fa-f]{6}$'`,
    ),
  ],
);

/** Usuarias del panel (las administradoras). */
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});
