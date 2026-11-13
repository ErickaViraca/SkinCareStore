import { isExpired } from "./fefo";
import { type Cents } from "./money";
import { roundOfferPrice } from "./price-rounding";
import { Ratio } from "./ratio";

/**
 * Ofertas automáticas por vencimiento (docs/ESPECIFICACION.md §4.8).
 *
 *   ganancia del lote = precio normal − costo real del lote
 *   precio de oferta  = costo real + ganancia × (1 − descuento del escalón)
 *
 * La oferta aplica solo a las unidades del lote que entra en un escalón y
 * termina sola cuando se venden o cuando el lote vence.
 */

/** Escalón de vencimiento, igual que `settings.expiry_tiers`. */
export interface ExpiryTier {
  readonly months: number;
  readonly discountPct: number;
}

/** Oferta calculada para un lote. */
export interface LotOffer {
  readonly tier: ExpiryTier;
  readonly offerPrice: Cents;
}

/** Suma meses a una fecha ISO "AAAA-MM-DD". Si el día no existe (31 de febrero), usa el último día del mes. */
export function addMonths(isoDate: string, months: number): string {
  const [year = 0, month = 1, day = 1] = isoDate.split("-").map(Number);
  const targetMonthIndex = month - 1 + months;
  const lastDayOfTarget = new Date(Date.UTC(year, targetMonthIndex + 1, 0)).getUTCDate();
  const target = new Date(Date.UTC(year, targetMonthIndex, Math.min(day, lastDayOfTarget)));
  return target.toISOString().slice(0, 10);
}

/**
 * Escalón que corresponde a un lote hoy: el más urgente (menos meses) cuyo
 * plazo ya alcanzó al vencimiento. `null` si no vence pronto, no tiene fecha o ya venció.
 */
export function findExpiryTier(
  expiresOn: string | null,
  today: string,
  tiers: readonly ExpiryTier[],
): ExpiryTier | null {
  if (expiresOn === null || isExpired(expiresOn, today)) return null;
  const matching = tiers.filter((tier) => expiresOn <= addMonths(today, tier.months));
  return matching.reduce<ExpiryTier | null>(
    (urgent, tier) => (urgent === null || tier.months < urgent.months ? tier : urgent),
    null,
  );
}

/**
 * Precio de oferta de un lote, o `null` si no corresponde oferta (sin ganancia
 * que descontar, o porque al redondear no queda por debajo del precio normal).
 * Nunca queda por debajo del costo real del lote.
 */
export function calculateOfferPrice(listPrice: Cents, lotCost: Cents, discountPct: number): Cents | null {
  if (!Number.isFinite(discountPct) || discountPct < 0 || discountPct > 100) {
    throw new RangeError("El descuento debe estar entre 0 y 100.");
  }
  const profit = listPrice - lotCost;
  if (profit <= 0 || discountPct === 0) return null;

  const keptShare = Ratio.of(1).subtract(percentAsRatio(discountPct));
  const exact = Ratio.of(lotCost).add(Ratio.of(profit).multiply(keptShare));
  const offerPrice = roundOfferPrice(exact, lotCost);
  return offerPrice < listPrice ? offerPrice : null;
}

/** Oferta que corresponde hoy a un lote, o `null` si no corresponde ninguna. */
export function offerForLot(
  lot: { readonly expiresOn: string | null; readonly landedUnitCost: Cents },
  listPrice: Cents,
  today: string,
  tiers: readonly ExpiryTier[],
): LotOffer | null {
  const tier = findExpiryTier(lot.expiresOn, today, tiers);
  if (tier === null) return null;
  const offerPrice = calculateOfferPrice(listPrice, lot.landedUnitCost, tier.discountPct);
  return offerPrice === null ? null : { tier, offerPrice };
}

/** Porcentaje con hasta 2 decimales como fracción exacta: 12.5 → 1/8. */
function percentAsRatio(pct: number): Ratio {
  const hundredths = Math.round(pct * 100);
  if (Math.abs(hundredths - pct * 100) > 1e-9) throw new RangeError("El descuento admite hasta 2 decimales.");
  return Ratio.of(hundredths, 10_000);
}
