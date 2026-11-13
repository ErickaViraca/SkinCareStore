-- Precio mínimo en la base de datos (docs/ESPECIFICACION.md §4.4–§4.6).
-- Es la misma lógica que src/domain/pricing.ts y src/domain/price-rounding.ts:
-- los tests de paridad comparan ambas versiones con miles de valores.
-- Todo se calcula como fracción exacta (numerador / denominador en centavos)
-- y se redondea una sola vez, al final.

-- Redondeo del precio mínimo: exacto → 5 → 9,90, hacia arriba (§4.5).
-- Recibe el precio exacto como fracción num/den de centavos y devuelve centavos.
CREATE FUNCTION soleil_round_minimum_price(num numeric, den numeric) RETURNS numeric
LANGUAGE sql IMMUTABLE STRICT
AS $$
  SELECT CASE
    WHEN num = d.decade * den THEN d.decade
    WHEN num <= (d.decade + 500) * den THEN d.decade + 500
    WHEN num <= (d.decade + 990) * den THEN d.decade + 990
    ELSE d.decade + 1500
  END
  FROM (SELECT div(num, den * 1000) * 1000 AS decade) AS d
$$;
--> statement-breakpoint

-- Costo promedio y precio mínimo de cada variante.
-- El costo promedio usa solo lotes pagados, no vencidos y con saldo; si no queda
-- stock pagado, el costo de la última compra pagada (§4.4). Sin referencia, el
-- precio mínimo es NULL (el precio se pone a mano).
CREATE VIEW v_variant_pricing AS
WITH stock AS (
  SELECT
    ls.variant_id,
    SUM(ls.remaining * ls.landed_unit_cost_bs * 100) AS cost_num,
    SUM(ls.remaining) AS cost_den
  FROM v_lot_stock ls
  WHERE NOT ls.is_gift AND NOT ls.is_expired AND ls.remaining > 0
  GROUP BY ls.variant_id
),
last_paid AS (
  SELECT DISTINCT ON (l.variant_id)
    l.variant_id,
    l.landed_unit_cost_bs * 100 AS cost_cents
  FROM lots l
  JOIN purchases p ON p.id = l.purchase_id
  WHERE NOT l.is_gift AND p.status = 'registered'
  ORDER BY l.variant_id, p.purchase_date DESC, l.created_at DESC, l.id DESC
),
base AS (
  SELECT
    v.id AS variant_id,
    v.sale_price_bs,
    COALESCE(st.cost_num, lp.cost_cents) AS cost_num,
    COALESCE(st.cost_den, CASE WHEN lp.cost_cents IS NULL THEN NULL ELSE 1 END) AS cost_den,
    COALESCE(v.margin_mode, 'pct') AS margin_mode,
    CASE
      WHEN v.margin_mode IS NULL THEN s.default_margin_pct
      ELSE COALESCE(v.margin_pct, s.default_margin_pct)
    END * 100 AS pct_hundredths,
    v.margin_fixed_bs * 100 AS fixed_cents
  FROM product_variants v
  CROSS JOIN settings s
  LEFT JOIN stock st ON st.variant_id = v.id
  LEFT JOIN last_paid lp ON lp.variant_id = v.id
),
fractions AS (
  SELECT
    b.*,
    b.cost_num * (10000 + b.pct_hundredths) AS pct_num,
    b.cost_den * 10000 AS pct_den,
    b.cost_num + b.fixed_cents * b.cost_den AS fixed_num,
    b.cost_den AS fixed_den
  FROM base b
),
raw AS (
  SELECT
    f.*,
    CASE
      WHEN f.margin_mode = 'pct' THEN f.pct_num
      WHEN f.margin_mode = 'fixed' THEN f.fixed_num
      WHEN f.pct_num * f.fixed_den >= f.fixed_num * f.pct_den THEN f.pct_num
      ELSE f.fixed_num
    END AS raw_num,
    CASE
      WHEN f.margin_mode = 'pct' THEN f.pct_den
      WHEN f.margin_mode = 'fixed' THEN f.fixed_den
      WHEN f.pct_num * f.fixed_den >= f.fixed_num * f.pct_den THEN f.pct_den
      ELSE f.fixed_den
    END AS raw_den
  FROM fractions f
)
SELECT
  r.variant_id,
  r.sale_price_bs,
  r.margin_mode,
  ROUND(r.cost_num / r.cost_den / 100, 4) AS average_cost_bs,
  (soleil_round_minimum_price(r.raw_num, r.raw_den) / 100)::numeric(12, 2) AS minimum_price_bs
FROM raw r;
--> statement-breakpoint

GRANT SELECT ON v_variant_pricing TO soleil_app;
--> statement-breakpoint

-- La base rechaza guardar un precio de venta menor al precio mínimo (§4.6).
CREATE FUNCTION soleil_check_sale_price() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  minimum numeric;
BEGIN
  SELECT minimum_price_bs INTO minimum FROM v_variant_pricing WHERE variant_id = NEW.id;
  IF minimum IS NOT NULL AND NEW.sale_price_bs < minimum THEN
    RAISE EXCEPTION 'El precio de venta (%) es menor al precio mínimo (%).', NEW.sale_price_bs, minimum
      USING ERRCODE = 'check_violation', CONSTRAINT = 'product_variants_price_not_below_minimum';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint

CREATE TRIGGER product_variants_price_not_below_minimum
BEFORE UPDATE OF sale_price_bs ON product_variants
FOR EACH ROW
WHEN (NEW.sale_price_bs IS DISTINCT FROM OLD.sale_price_bs)
EXECUTE FUNCTION soleil_check_sale_price();
