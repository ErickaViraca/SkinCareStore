import { type Cents, cents } from "./money";
import { Ratio } from "./ratio";

/**
 * Costos de compra y costo promedio del stock (docs/ESPECIFICACION.md §4.2–§4.4).
 * Funciones puras: reciben datos ya leídos de la base y devuelven resultados.
 */

/** Una línea de compra tal como la carga la administradora. */
export interface PurchaseLineInput {
  /** Unidades pagadas. */
  readonly quantity: number;
  /** Unidades de regalo del mismo producto (por ejemplo, la "+1" de una promo 10+1). */
  readonly freeQuantity: number;
  /** Precio pagado por unidad. */
  readonly unitPrice: Cents;
  /** Línea completa de regalo de otro producto: costo 0 (§4.3). */
  readonly isGift: boolean;
}

/**
 * Costo real por unidad de cada línea de una compra (§4.2):
 *
 *   (cantidad pagada × precio + parte del envío) / (cantidad pagada + regalos del mismo producto)
 *
 * - El envío se reparte **por igual entre todas las unidades** de la compra,
 *   pagadas y de regalo del mismo producto.
 * - Las líneas de regalo de otro producto no reciben envío y cuestan 0.
 * - El resultado se guarda en centavos y se redondea **hacia arriba**: así el
 *   costo nunca se subestima, el precio mínimo nunca queda corto y la utilidad
 *   nunca se infla. La diferencia es de menos de 1 centavo por unidad.
 *
 * Devuelve los costos en el mismo orden que las líneas recibidas.
 */
export function calculateLandedUnitCosts(shippingCost: Cents, lines: readonly PurchaseLineInput[]): Cents[] {
  lines.forEach(assertValidLine);
  if (shippingCost < 0) throw new RangeError("El envío no puede ser negativo.");

  const unitsSharingShipping = lines
    .filter((line) => !line.isGift)
    .reduce((total, line) => total + line.quantity + line.freeQuantity, 0);
  const shippingPerUnit = unitsSharingShipping === 0 ? Ratio.of(0) : Ratio.of(shippingCost, unitsSharingShipping);

  return lines.map((line) => {
    if (line.isGift) return cents(0);
    const units = line.quantity + line.freeQuantity;
    const paid = Ratio.of(line.unitPrice).multiply(Ratio.of(line.quantity));
    const exact = paid.divide(Ratio.of(units)).add(shippingPerUnit);
    return cents(Number(exact.ceil()));
  });
}

function assertValidLine(line: PurchaseLineInput): void {
  if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
    throw new RangeError("La cantidad pagada debe ser un entero mayor a 0.");
  }
  if (!Number.isInteger(line.freeQuantity) || line.freeQuantity < 0) {
    throw new RangeError("Las unidades de regalo deben ser un entero mayor o igual a 0.");
  }
  if (line.unitPrice < 0) throw new RangeError("El precio de compra no puede ser negativo.");
  if (line.isGift && (line.unitPrice !== 0 || line.freeQuantity !== 0)) {
    throw new RangeError("Una línea de regalo de otro producto tiene precio 0 y no lleva regalos propios.");
  }
}

/** Saldo de un lote, tal como lo da la vista `v_lot_stock`. */
export interface LotBalance {
  readonly remaining: number;
  readonly landedUnitCost: Cents;
  readonly isGift: boolean;
  readonly isExpired: boolean;
}

/**
 * Costo promedio del stock que se puede vender (§4.4), exacto (sin redondear):
 *
 *   Σ(saldo × costo real) / Σ(saldo)
 *
 * Solo cuentan los lotes **pagados**, **no vencidos** y **con saldo**: los
 * regalos de otro producto (costo 0) bajarían el promedio sin motivo (§4.3) y
 * las unidades vencidas ya no se venden.
 *
 * Si no queda stock pagado, se usa el costo real de la última compra pagada.
 * Si tampoco existe, devuelve `null`: no hay referencia y el precio se pone a mano.
 */
export function calculateAverageCost(lots: readonly LotBalance[], lastPaidUnitCost: Cents | null): Ratio | null {
  const counted = lots.filter((lot) => !lot.isGift && !lot.isExpired && lot.remaining > 0);
  const units = counted.reduce((total, lot) => total + lot.remaining, 0);

  if (units === 0) return lastPaidUnitCost === null ? null : Ratio.of(lastPaidUnitCost);

  const totalCost = counted.reduce(
    (total, lot) => total.add(Ratio.of(lot.landedUnitCost).multiply(Ratio.of(lot.remaining))),
    Ratio.of(0),
  );
  return totalCost.divide(Ratio.of(units));
}
