import { type Cents, cents } from "./money";
import { Ratio } from "./ratio";

/**
 * Redondeos de precios (docs/ESPECIFICACION.md §4.5 y §4.8).
 * Ambas funciones reciben el valor exacto en centavos (un `Ratio`, que puede
 * tener fracciones de centavo) y redondean una sola vez.
 */

const TEN_BS = 1000n;
const FIVE_BS = 500n;
const NINE_BS_NINETY = 990n;
const TEN_CENTS = 10n;

/**
 * Redondeo "psicológico" del precio mínimo (§4.5): el primer valor que no
 * sea menor al calculado, probando en cada decena el número redondo (solo si
 * el cálculo es exacto), luego el que termina en 5 y luego el que termina en 9,90.
 *
 *   250,00 → 250    250,01 … 255,00 → 255    255,01 … 259,90 → 259,90    259,91 → 265
 */
export function roundMinimumPrice(exactCents: Ratio): Cents {
  assertNonNegative(exactCents);
  const decade = (exactCents.floor() / TEN_BS) * TEN_BS;

  // El número redondo solo vale si el cálculo cae exactamente en él.
  if (exactCents.compare(Ratio.of(decade)) === 0) return cents(Number(decade));

  const chosen = [decade + FIVE_BS, decade + NINE_BS_NINETY].find(
    (candidate) => exactCents.compare(Ratio.of(candidate)) <= 0,
  );
  // Entre X9,90 y X10,00 (sin llegar exacto) corresponde el 5 de la decena siguiente.
  return cents(Number(chosen ?? decade + TEN_BS + FIVE_BS));
}

/**
 * Redondeo del precio de oferta (§4.8): a 0,10 Bs hacia abajo, para que el
 * descuento se note y sea fácil cobrar en efectivo. Nunca queda por debajo
 * del costo real del lote: si al bajar lo cruzara, se redondea hacia arriba.
 *
 *   283,47 → 283,40    (costo 283,45) 283,47 → 283,50
 */
export function roundOfferPrice(exactCents: Ratio, costCents: Cents): Cents {
  assertNonNegative(exactCents);
  if (exactCents.compare(Ratio.of(costCents)) < 0) {
    throw new RangeError("El precio de oferta no puede ser menor al costo real del lote.");
  }
  const down = (exactCents.floor() / TEN_CENTS) * TEN_CENTS;
  if (down >= BigInt(costCents)) return cents(Number(down));
  const up = ((exactCents.ceil() + TEN_CENTS - 1n) / TEN_CENTS) * TEN_CENTS;
  return cents(Number(up));
}

function assertNonNegative(value: Ratio): void {
  if (value.compare(Ratio.of(0)) < 0) throw new RangeError("Un precio no puede ser negativo.");
}
