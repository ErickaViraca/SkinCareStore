-- Vistas (docs/ESPECIFICACION.md §3.8).
-- Una vista es una consulta guardada: no almacena datos y se calcula en cada lectura.
-- Las vistas v_* son privadas (panel). Las public_* son la única ventana de la página pública.

-- Saldo de cada lote: suma de sus movimientos de stock.
-- Un lote está vencido desde su fecha de vencimiento (§4.8): sus unidades ya no se venden.
CREATE VIEW v_lot_stock AS
SELECT
  l.id AS lot_id,
  l.variant_id,
  l.purchase_id,
  l.lot_code,
  l.expires_on,
  l.is_gift,
  l.landed_unit_cost_bs,
  (l.quantity + l.free_quantity) AS quantity_received,
  COALESCE(SUM(sm.quantity), 0)::integer AS remaining,
  (l.expires_on IS NOT NULL AND l.expires_on <= CURRENT_DATE) AS is_expired
FROM lots l
LEFT JOIN stock_movements sm ON sm.lot_id = l.id
GROUP BY l.id;
--> statement-breakpoint

-- Stock de cada variante: total, vendible (sin vencidos) y alerta de stock bajo.
-- El stock mínimo efectivo es el de la variante o, si no tiene, el de la tienda.
CREATE VIEW v_variant_stock AS
SELECT
  v.id AS variant_id,
  v.product_id,
  COALESCE(SUM(ls.remaining), 0)::integer AS on_hand,
  COALESCE(SUM(ls.remaining) FILTER (WHERE NOT ls.is_expired), 0)::integer AS sellable,
  COALESCE(v.min_stock, s.default_min_stock) AS min_stock_effective,
  (
    COALESCE(SUM(ls.remaining) FILTER (WHERE NOT ls.is_expired), 0) > 0
    AND COALESCE(SUM(ls.remaining) FILTER (WHERE NOT ls.is_expired), 0) <= COALESCE(v.min_stock, s.default_min_stock)
  ) AS is_low
FROM product_variants v
CROSS JOIN settings s
LEFT JOIN v_lot_stock ls ON ls.variant_id = v.id
GROUP BY v.id, s.default_min_stock;
--> statement-breakpoint

-- Saldo de cada cuenta de dinero (§4.11): suma de sus movimientos.
CREATE VIEW v_account_balance AS
SELECT
  a.id AS account_id,
  a.name,
  a.kind,
  a.active,
  COALESCE(SUM(m.amount_bs), 0)::numeric(12, 2) AS balance_bs
FROM money_accounts a
LEFT JOIN money_movements m ON m.account_id = a.id
GROUP BY a.id;
--> statement-breakpoint

-- Capital, porcentaje y ganancias de cada socia (§4.12, §4.13).
-- El porcentaje es el fijado a mano o, si no hay, su capital sobre el capital total de las socias activas.
CREATE VIEW v_partner_capital AS
WITH movement_totals AS (
  SELECT
    p.id AS partner_id,
    COALESCE(SUM(cm.amount_bs) FILTER (WHERE cm.type = 'contribution' AND cm.status = 'active'), 0) AS contributions_bs,
    COALESCE(SUM(cm.amount_bs) FILTER (WHERE cm.type = 'capital_withdrawal' AND cm.status = 'active'), 0) AS capital_withdrawals_bs,
    COALESCE(SUM(cm.amount_bs) FILTER (WHERE cm.type = 'profit_withdrawal' AND cm.status = 'active'), 0) AS profit_withdrawals_bs
  FROM partners p
  LEFT JOIN capital_movements cm ON cm.partner_id = p.id
  GROUP BY p.id
),
assigned_profit AS (
  SELECT partner_id, SUM(amount_bs) AS profit_assigned_bs
  FROM profit_distribution_lines
  GROUP BY partner_id
)
SELECT
  p.id AS partner_id,
  p.name,
  p.active,
  t.contributions_bs::numeric(12, 2) AS contributions_bs,
  t.capital_withdrawals_bs::numeric(12, 2) AS capital_withdrawals_bs,
  (t.contributions_bs - t.capital_withdrawals_bs)::numeric(12, 2) AS capital_balance_bs,
  COALESCE(
    p.share_pct_override,
    ROUND(
      100 * (t.contributions_bs - t.capital_withdrawals_bs)
        / NULLIF(SUM(t.contributions_bs - t.capital_withdrawals_bs) FILTER (WHERE p.active) OVER (), 0),
      2
    )
  ) AS share_pct,
  COALESCE(a.profit_assigned_bs, 0)::numeric(12, 2) AS profit_assigned_bs,
  t.profit_withdrawals_bs::numeric(12, 2) AS profit_withdrawals_bs,
  (COALESCE(a.profit_assigned_bs, 0) - t.profit_withdrawals_bs)::numeric(12, 2) AS profit_available_bs
FROM partners p
JOIN movement_totals t ON t.partner_id = p.id
LEFT JOIN assigned_profit a ON a.partner_id = p.id;
--> statement-breakpoint

-- Catálogo público (§6): una fila por variante publicada, solo con campos públicos.
-- Nunca incluye costos, lotes, vencimientos ni cantidades exactas de stock.
-- El precio de oferta se agrega en la etapa 2.
CREATE VIEW public_catalog AS
SELECT
  p.id AS product_id,
  p.slug AS product_slug,
  p.name AS product_name,
  p.description,
  p.usage_instructions,
  p.skin_types,
  p.featured,
  b.name AS brand_name,
  b.slug AS brand_slug,
  c.name AS category_name,
  c.slug AS category_slug,
  v.id AS variant_id,
  v.sku,
  v.shade,
  v.presentation,
  v.sale_price_bs,
  CASE
    WHEN vs.sellable <= 0 THEN 'out_of_stock'
    WHEN vs.sellable <= vs.min_stock_effective THEN 'low_stock'
    ELSE 'available'
  END AS availability,
  COALESCE(
    (
      SELECT json_agg(json_build_object('url', i.url, 'alt', i.alt, 'variantId', i.variant_id) ORDER BY i.sort_order)
      FROM product_images i
      WHERE i.product_id = p.id AND (i.variant_id IS NULL OR i.variant_id = v.id)
    ),
    '[]'::json
  ) AS images
FROM product_variants v
JOIN products p ON p.id = v.product_id
JOIN brands b ON b.id = p.brand_id
JOIN categories c ON c.id = p.category_id
JOIN v_variant_stock vs ON vs.variant_id = v.id
WHERE p.published
  AND p.archived_at IS NULL
  AND v.published
  AND v.archived_at IS NULL
  AND b.archived_at IS NULL
  AND c.archived_at IS NULL;
--> statement-breakpoint

-- Marcas visibles en la página pública.
CREATE VIEW public_brands AS
SELECT b.name, b.slug, b.logo_url
FROM brands b
WHERE b.archived_at IS NULL;
--> statement-breakpoint

-- Categorías visibles en la página pública.
CREATE VIEW public_categories AS
SELECT c.name, c.slug, parent.slug AS parent_slug
FROM categories c
LEFT JOIN categories parent ON parent.id = c.parent_id
WHERE c.archived_at IS NULL;
--> statement-breakpoint

-- Datos públicos de la tienda (contacto y redes).
CREATE VIEW public_settings AS
SELECT store_name, phones, addresses, whatsapp_url, instagram_url, facebook_url, tiktok_url
FROM settings;
