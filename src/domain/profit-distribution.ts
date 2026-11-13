import { type Cents, cents } from "./money";
import { Ratio } from "./ratio";

/**
 * Porcentajes de las socias y reparto de ganancias
 * (docs/ESPECIFICACION.md §4.12–§4.13).
 */

/** Socia con su capital y su porcentaje fijado a mano (si lo tiene). */
export interface PartnerCapital {
  readonly partnerId: string;
  readonly capitalBalance: Cents;
  /** Porcentaje fijado a mano como fracción (50% = 1/2), o `null`. */
  readonly shareOverride: Ratio | null;
}

/** Porcentaje de una socia como fracción exacta. */
export interface PartnerShare {
  readonly partnerId: string;
  readonly share: Ratio;
}

/** Monto que le toca a una socia en un reparto. */
export interface DistributionLine {
  readonly partnerId: string;
  readonly share: Ratio;
  readonly amount: Cents;
}

/**
 * Resultado de calcular los porcentajes.
 * Patrón: **Result / unión discriminada**: los casos sin solución son
 * esperables (todavía no se cargó el capital) y la UI debe explicarlos.
 */
export type SharesResult =
  | { readonly ok: true; readonly shares: readonly PartnerShare[] }
  | {
      readonly ok: false;
      readonly reason: "no_partners" | "no_capital" | "overrides_incomplete" | "overrides_not_100";
    };

const ONE = Ratio.of(1);

/**
 * Porcentaje de cada socia activa (§4.12):
 * - si alguna tiene porcentaje fijado a mano, todas deben tenerlo y sumar 100%;
 * - si no, cada una según su capital sobre el capital total.
 */
export function resolvePartnerShares(partners: readonly PartnerCapital[]): SharesResult {
  if (partners.length === 0) return { ok: false, reason: "no_partners" };

  const withOverride = partners.filter((partner) => partner.shareOverride !== null);
  if (withOverride.length > 0) {
    if (withOverride.length !== partners.length) return { ok: false, reason: "overrides_incomplete" };
    const shares = partners.map((partner) => ({ partnerId: partner.partnerId, share: partner.shareOverride ?? ONE }));
    return sumShares(shares).compare(ONE) === 0 ? { ok: true, shares } : { ok: false, reason: "overrides_not_100" };
  }

  const totalCapital = partners.reduce((total, partner) => total + Math.max(partner.capitalBalance, 0), 0);
  if (totalCapital <= 0) return { ok: false, reason: "no_capital" };
  return {
    ok: true,
    shares: partners.map((partner) => ({
      partnerId: partner.partnerId,
      share: Ratio.of(Math.max(partner.capitalBalance, 0), totalCapital),
    })),
  };
}

/**
 * Reparte un monto según los porcentajes, en centavos exactos.
 *
 * Patrón: **método del mayor resto** (Hamilton). Cada socia recibe la parte
 * entera de su porcentaje; los centavos sobrantes se asignan uno a uno a
 * quienes tenían la mayor fracción. Así la suma es exactamente el monto
 * repartido y nadie recibe más de 1 centavo de diferencia con su parte exacta.
 */
export function distributeProfit(amount: Cents, shares: readonly PartnerShare[]): DistributionLine[] {
  if (amount < 0) throw new RangeError("El monto a repartir no puede ser negativo.");
  if (sumShares(shares).compare(ONE) !== 0) throw new RangeError("Los porcentajes deben sumar 100%.");

  const exact = shares.map((entry) => ({ ...entry, value: Ratio.of(amount).multiply(entry.share) }));
  const base = exact.map((entry) => Number(entry.value.floor()));
  let leftover = amount - base.reduce((total, value) => total + value, 0);

  const byRemainder = exact
    .map((entry, index) => ({
      index,
      remainder: entry.value.subtract(Ratio.of(entry.value.floor())),
      id: entry.partnerId,
    }))
    .sort((a, b) => b.remainder.compare(a.remainder) || a.id.localeCompare(b.id));
  for (const { index } of byRemainder) {
    if (leftover === 0) break;
    base[index] = (base[index] ?? 0) + 1;
    leftover -= 1;
  }

  return exact.map((entry, index) => ({
    partnerId: entry.partnerId,
    share: entry.share,
    amount: cents(base[index] ?? 0),
  }));
}

/** ¿Se puede repartir este monto? Nunca más que la ganancia acumulada sin repartir (§4.13). */
export function canDistribute(amount: Cents, undistributed: Cents): boolean {
  return amount > 0 && amount <= undistributed;
}

/**
 * ¿Puede una socia retirar este monto de ganancias? Nunca más de lo que le
 * tocó en los repartos menos lo que ya retiró (§4.13).
 */
export function canWithdrawProfit(requested: Cents, assigned: Cents, alreadyWithdrawn: Cents): boolean {
  return requested > 0 && requested <= assigned - alreadyWithdrawn;
}

function sumShares(shares: readonly PartnerShare[]): Ratio {
  return shares.reduce((total, entry) => total.add(entry.share), Ratio.of(0));
}
