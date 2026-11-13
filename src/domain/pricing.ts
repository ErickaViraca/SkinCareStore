import { type Cents } from "./money";
import { roundMinimumPrice } from "./price-rounding";
import { Ratio } from "./ratio";

/**
 * Precio mínimo, subida automática y validación de precios
 * (docs/ESPECIFICACION.md §4.5–§4.6).
 *
 * Patrón: **Strategy**. Cada modo de margen (porcentaje, monto fijo o el
 * mayor de los dos) es una forma distinta de calcular el precio sin
 * redondear; agregar o cambiar un modo no toca a los demás.
 *
 * Esta lógica también existe en SQL (migración 0004) para que la base
 * rechace precios bajo el mínimo. Los tests comparan ambas versiones.
 */

/** Modo de margen, igual que el enum `margin_mode` de la base. */
export type MarginMode = "pct" | "fixed" | "max";

/** Porcentaje como fracción exacta: 25% = 1/4. */
export type Percent = Ratio;

/** Márgenes configurados en una variante; `null` = usa el de la tienda. */
export interface VariantMarginSettings {
  readonly marginMode: MarginMode | null;
  readonly marginPct: Percent | null;
  readonly marginFixed: Cents | null;
}

/** Margen ya resuelto, listo para calcular. */
export type MarginPolicy =
  | { readonly mode: "pct"; readonly pct: Percent }
  | { readonly mode: "fixed"; readonly fixed: Cents }
  | { readonly mode: "max"; readonly pct: Percent; readonly fixed: Cents };

const PERCENT_PATTERN = /^\d+(?:\.\d{1,2})?$/;

/** Lee un porcentaje con hasta 2 decimales ("25", "25.00", "12.5") como fracción exacta. */
export function parsePercent(text: string): Percent {
  const trimmed = text.trim();
  if (!PERCENT_PATTERN.test(trimmed)) throw new RangeError(`Porcentaje inválido: "${text}"`);
  const [whole = "0", fraction = ""] = trimmed.split(".");
  return Ratio.of(BigInt(whole + fraction.padEnd(2, "0")), 10_000n);
}

/**
 * Combina los márgenes de la variante con el de la tienda (§3.2):
 * - sin modo propio → porcentaje de la tienda;
 * - "pct" → su porcentaje o, si no tiene, el de la tienda;
 * - "fixed" → su monto fijo (obligatorio);
 * - "max" → su porcentaje (o el de la tienda) y su monto fijo (obligatorio).
 */
export function resolveMarginPolicy(variant: VariantMarginSettings, storeDefaultPct: Percent): MarginPolicy {
  const pct = variant.marginPct ?? storeDefaultPct;
  switch (variant.marginMode) {
    case null:
      return { mode: "pct", pct: storeDefaultPct };
    case "pct":
      return { mode: "pct", pct };
    case "fixed":
      return { mode: "fixed", fixed: requireFixed(variant.marginFixed) };
    case "max":
      return { mode: "max", pct, fixed: requireFixed(variant.marginFixed) };
  }
}

function requireFixed(fixed: Cents | null): Cents {
  if (fixed === null) throw new RangeError("El modo de margen fijo necesita un monto fijo.");
  return fixed;
}

/** Precio exacto, sin redondear, según el modo de margen. */
export function calculateRawMinimumPrice(averageCost: Ratio, policy: MarginPolicy): Ratio {
  const withPct = (pct: Percent): Ratio => averageCost.multiply(Ratio.of(1).add(pct));
  const withFixed = (fixed: Cents): Ratio => averageCost.add(Ratio.of(fixed));
  switch (policy.mode) {
    case "pct":
      return withPct(policy.pct);
    case "fixed":
      return withFixed(policy.fixed);
    case "max": {
      const byPct = withPct(policy.pct);
      const byFixed = withFixed(policy.fixed);
      return byPct.compare(byFixed) >= 0 ? byPct : byFixed;
    }
  }
}

/** Precio mínimo de venta (§4.5): precio exacto según el margen, redondeado una sola vez. */
export function calculateMinimumPrice(averageCost: Ratio, policy: MarginPolicy): Cents {
  return roundMinimumPrice(calculateRawMinimumPrice(averageCost, policy));
}

/** Resultado de revisar el precio actual contra un nuevo precio mínimo. */
export type AutoRaiseDecision =
  { readonly raise: false } | { readonly raise: true; readonly newPrice: Cents; readonly previousPrice: Cents };

/**
 * Subida automática (§4.6): si el precio actual quedó por debajo del mínimo,
 * sube al mínimo. Nunca baja un precio.
 */
export function decideAutoRaise(currentPrice: Cents, minimumPrice: Cents | null): AutoRaiseDecision {
  if (minimumPrice === null || currentPrice >= minimumPrice) return { raise: false };
  return { raise: true, newPrice: minimumPrice, previousPrice: currentPrice };
}

/** ¿Se puede guardar este precio a mano? Nunca por debajo del mínimo (§4.6). */
export function isPriceAllowed(price: Cents, minimumPrice: Cents | null): boolean {
  return price >= 0 && (minimumPrice === null || price >= minimumPrice);
}
