-- Usuarios de base de datos y permisos (docs/ESPECIFICACION.md §3.8 y §6).
--
-- soleil_app: el panel. Lee y escribe, pero:
--   - nunca borra (las cosas se archivan o se anulan), salvo fotos de productos;
--   - las tablas de historial y movimientos solo admiten INSERT (no UPDATE);
--   - de un lote solo se pueden corregir el código y el vencimiento, no su costo.
-- soleil_web: la página pública y el futuro agente de WhatsApp. Solo puede leer las vistas public_*.
--
-- Los roles se crean sin login. En Neon, la contraseña y el LOGIN se asignan a mano
-- (ALTER ROLE ... LOGIN PASSWORD ...), nunca en una migración.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'soleil_app') THEN
    CREATE ROLE soleil_app NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'soleil_web') THEN
    CREATE ROLE soleil_web NOLOGIN;
  END IF;
END
$$;
--> statement-breakpoint

GRANT USAGE ON SCHEMA public TO soleil_app, soleil_web;
--> statement-breakpoint

-- Panel: lectura de todo y escritura según la naturaleza de cada tabla.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO soleil_app;
--> statement-breakpoint
GRANT INSERT ON ALL TABLES IN SCHEMA public TO soleil_app;
--> statement-breakpoint
GRANT UPDATE ON
  settings, admin_users, brands, categories, products, product_variants, product_images,
  money_accounts, partners, expense_categories, recurring_expenses,
  suppliers, purchases, inventory_counts, inventory_count_lines,
  sales, capital_movements, expenses
TO soleil_app;
--> statement-breakpoint
GRANT UPDATE (lot_code, expires_on) ON lots TO soleil_app;
--> statement-breakpoint
GRANT DELETE ON product_images TO soleil_app;
--> statement-breakpoint

-- Las vistas no se escriben.
REVOKE INSERT ON
  v_lot_stock, v_variant_stock, v_account_balance, v_partner_capital,
  public_catalog, public_brands, public_categories, public_settings
FROM soleil_app;
--> statement-breakpoint

-- Página pública: solo las vistas public_*.
GRANT SELECT ON public_catalog, public_brands, public_categories, public_settings TO soleil_web;
