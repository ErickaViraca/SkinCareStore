-- Datos iniciales (docs/ESPECIFICACION.md §3.1, §3.5, §3.6, §3.7).
-- Son idempotentes: si ya existen, no se duplican.

-- Configuración de la tienda: margen 25%, stock mínimo 2, escalones de vencimiento 6/3/2 meses → 10/25/50%.
INSERT INTO settings (id, store_name, default_margin_pct, default_min_stock, expiry_tiers)
VALUES (
  1,
  'Soleil',
  25,
  2,
  '[{"months": 6, "discountPct": 10}, {"months": 3, "discountPct": 25}, {"months": 2, "discountPct": 50}]'::jsonb
)
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint

-- Cuentas de dinero.
INSERT INTO money_accounts (name, kind)
VALUES ('Caja', 'cash'), ('Banco', 'bank')
ON CONFLICT (name) DO NOTHING;
--> statement-breakpoint

-- Socias. El capital inicial se carga después (§9).
INSERT INTO partners (name)
VALUES ('Vanessa'), ('Ericka')
ON CONFLICT (name) DO NOTHING;
--> statement-breakpoint

-- Categoría de gasto inicial.
INSERT INTO expense_categories (name)
VALUES ('Alquiler')
ON CONFLICT (name) DO NOTHING;
