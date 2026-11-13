/**
 * Qué lote se vende primero (docs/ESPECIFICACION.md §4.1 y §4.8).
 *
 * Regla FEFO (*First Expired, First Out*): se descuenta primero del lote que
 * vence antes. Los lotes sin fecha de vencimiento van al final. Ante igual
 * vencimiento, primero el que llegó antes. Las unidades vencidas (desde su
 * fecha de vencimiento) nunca se venden.
 */

/** Lote disponible para vender. Las fechas van en formato ISO "AAAA-MM-DD". */
export interface FefoLot {
  readonly lotId: string;
  readonly remaining: number;
  readonly expiresOn: string | null;
  /** Fecha en que se registró el lote, para desempatar. */
  readonly receivedOn: string;
}

/** Cuántas unidades se toman de cada lote. */
interface LotAllocation {
  readonly lotId: string;
  readonly quantity: number;
}

/**
 * Resultado del reparto.
 * Patrón: **Result / unión discriminada**. No alcanzar el stock es un caso
 * esperado, no un error del programa: el servicio decide qué mensaje mostrar.
 */
export type FefoResult =
  | { readonly ok: true; readonly allocations: readonly LotAllocation[] }
  | { readonly ok: false; readonly available: number };

/** ¿El lote está vencido en la fecha `today`? Vence desde su fecha de vencimiento inclusive. */
export function isExpired(expiresOn: string | null, today: string): boolean {
  return expiresOn !== null && expiresOn <= today;
}

/** Lotes que se pueden vender hoy, en el orden en que se deben vender. */
export function sellableLotsInFefoOrder(lots: readonly FefoLot[], today: string): FefoLot[] {
  return lots.filter((lot) => lot.remaining > 0 && !isExpired(lot.expiresOn, today)).sort(compareFefo);
}

/**
 * Reparte `quantity` unidades entre los lotes, en orden FEFO.
 * Si no alcanza, devuelve cuántas unidades vendibles hay.
 */
export function allocateFefo(lots: readonly FefoLot[], quantity: number, today: string): FefoResult {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new RangeError("La cantidad a vender debe ser un entero mayor a 0.");
  }
  const sellable = sellableLotsInFefoOrder(lots, today);
  const available = sellable.reduce((total, lot) => total + lot.remaining, 0);
  if (available < quantity) return { ok: false, available };

  const allocations: LotAllocation[] = [];
  let pending = quantity;
  for (const lot of sellable) {
    if (pending === 0) break;
    const taken = Math.min(lot.remaining, pending);
    allocations.push({ lotId: lot.lotId, quantity: taken });
    pending -= taken;
  }
  return { ok: true, allocations };
}

function compareFefo(a: FefoLot, b: FefoLot): number {
  if (a.expiresOn !== b.expiresOn) {
    if (a.expiresOn === null) return 1;
    if (b.expiresOn === null) return -1;
    return a.expiresOn < b.expiresOn ? -1 : 1;
  }
  if (a.receivedOn !== b.receivedOn) return a.receivedOn < b.receivedOn ? -1 : 1;
  return a.lotId.localeCompare(b.lotId);
}
