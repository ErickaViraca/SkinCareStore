-- Estado "Disponible pronto" en la página pública (etapa 3c).
-- Sin stock, un producto con la casilla coming_soon marcada se muestra como
-- 'coming_soon' en vez de 'out_of_stock'. Con stock, la casilla no cambia nada.
-- Mismas columnas que antes: solo cambia el cálculo de availability.
CREATE OR REPLACE VIEW public_catalog AS
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
    WHEN vs.sellable <= 0 AND p.coming_soon THEN 'coming_soon'
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
