/**
 * Dinero en centavos de boliviano (docs/guias/typescript.md §4).
 *
 * Patrón: **tipo con marca (branded type)**. `Cents` es un número entero,
 * pero TypeScript no deja mezclarlo por error con bolivianos, cantidades de
 * stock u otros números. Toda conversión de dinero pasa por este módulo.
 */

/** Monto en centavos de boliviano. 289,90 Bs = 28990. */
export type Cents = number & { readonly __brand: "Cents" };

/** Formato que usa la base de datos para `numeric(12,2)`: "289.90", "-12.5", "100". */
const DB_MONEY_PATTERN = /^(-)?(\d+)(?:\.(\d{1,2}))?$/;

const DISPLAY_FORMAT = new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Convierte un número entero de centavos en `Cents`. Falla si no es un entero seguro. */
export function cents(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Monto en centavos inválido: ${value}`);
  }
  return value as Cents;
}

/**
 * Lee un monto tal como lo devuelve la base ("289.90") y lo convierte a
 * centavos sin pasar por decimales de punto flotante.
 */
export function parseDbMoney(text: string): Cents {
  const match = DB_MONEY_PATTERN.exec(text.trim());
  if (!match) {
    throw new RangeError(`Monto con formato inválido: "${text}"`);
  }
  const [, sign, whole = "0", fraction = ""] = match;
  const absolute = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return cents(sign ? -absolute : absolute);
}

/** Convierte centavos al formato de la base: 28990 → "289.90". */
export function toDbMoney(amount: Cents): string {
  const sign = amount < 0 ? "-" : "";
  const absolute = Math.abs(amount);
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, "0");
  return `${sign}${whole}.${fraction}`;
}

/** Texto para mostrar a la usuaria: 123450 → "Bs 1.234,50". */
export function formatBs(amount: Cents): string {
  return `Bs ${DISPLAY_FORMAT.format(amount / 100)}`;
}
