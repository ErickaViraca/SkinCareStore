/**
 * Número racional exacto (numerador / denominador con enteros grandes).
 *
 * Patrón: **objeto de valor (Value Object) inmutable**. Los cálculos de costo
 * promedio y precio mínimo pueden dar fracciones de centavo (por ejemplo
 * 2215 / 11 = 201,3636…). Con decimales de punto flotante, un resultado que
 * debería ser exactamente 250,00 puede quedar en 250,0000001 y redondearse mal.
 * Con `Ratio` el cálculo es exacto y se redondea **una sola vez, al final**
 * (decisión de la etapa 2).
 */
export class Ratio {
  /** Numerador, con el signo del número. */
  readonly numerator: bigint;
  /** Denominador, siempre positivo. */
  readonly denominator: bigint;

  private constructor(numerator: bigint, denominator: bigint) {
    if (denominator === 0n) throw new RangeError("División por cero.");
    const sign = denominator < 0n ? -1n : 1n;
    const divisor = gcd(abs(numerator), abs(denominator)) || 1n;
    this.numerator = (sign * numerator) / divisor;
    this.denominator = (sign * denominator) / divisor;
  }

  /** Crea `numerator / denominator` a partir de enteros. */
  static of(numerator: bigint | number, denominator: bigint | number = 1): Ratio {
    return new Ratio(toBigInt(numerator), toBigInt(denominator));
  }

  add(other: Ratio): Ratio {
    return new Ratio(
      this.numerator * other.denominator + other.numerator * this.denominator,
      this.denominator * other.denominator,
    );
  }

  subtract(other: Ratio): Ratio {
    return this.add(other.negate());
  }

  multiply(other: Ratio): Ratio {
    return new Ratio(this.numerator * other.numerator, this.denominator * other.denominator);
  }

  divide(other: Ratio): Ratio {
    return new Ratio(this.numerator * other.denominator, this.denominator * other.numerator);
  }

  negate(): Ratio {
    return new Ratio(-this.numerator, this.denominator);
  }

  /** -1 si es menor que `other`, 0 si es igual, 1 si es mayor. */
  compare(other: Ratio): -1 | 0 | 1 {
    const difference = this.numerator * other.denominator - other.numerator * this.denominator;
    if (difference === 0n) return 0;
    return difference < 0n ? -1 : 1;
  }

  isInteger(): boolean {
    return this.denominator === 1n;
  }

  /** Mayor entero que no supera este número. */
  floor(): bigint {
    const quotient = this.numerator / this.denominator;
    return this.numerator < 0n && quotient * this.denominator !== this.numerator ? quotient - 1n : quotient;
  }

  /** Menor entero que no es menor que este número. */
  ceil(): bigint {
    return -this.negate().floor();
  }
}

function toBigInt(value: bigint | number): bigint {
  if (typeof value === "bigint") return value;
  if (!Number.isSafeInteger(value)) throw new RangeError(`Se esperaba un entero: ${value}`);
  return BigInt(value);
}

function abs(value: bigint): bigint {
  return value < 0n ? -value : value;
}

function gcd(a: bigint, b: bigint): bigint {
  let x = a;
  let y = b;
  while (y !== 0n) [x, y] = [y, x % y];
  return x;
}
