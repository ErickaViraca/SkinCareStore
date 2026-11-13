import { type Cents, cents } from "./money";

/**
 * Utilidad de las ventas y resultado mensual (docs/ESPECIFICACION.md §4.13).
 * La utilidad usa siempre el **costo real del lote** de cada unidad vendida
 * (guardado en cada ítem de venta), no un promedio: es exacta.
 */

/** Ítem de una venta completada (una línea por lote). */
export interface SoldItem {
  readonly quantity: number;
  readonly unitPrice: Cents;
  readonly unitCost: Cents;
}

/**
 * Movimiento de stock que cuenta como pérdida o ganancia de inventario:
 * vencidos, dañados, muestras y ajustes (incluidos los del cuadre).
 * `quantity` lleva signo: negativo = salió stock (pérdida).
 */
interface InventoryAdjustment {
  readonly quantity: number;
  readonly unitCost: Cents;
}

/** Datos de un período (normalmente un mes) para calcular su resultado. */
export interface PeriodInput {
  readonly soldItems: readonly SoldItem[];
  /** Gastos activos del período (alquiler, etc.). */
  readonly expenses: readonly Cents[];
  readonly inventoryAdjustments: readonly InventoryAdjustment[];
}

/** Resultado de un período (§4.13). */
export interface PeriodResult {
  readonly revenue: Cents;
  readonly costOfGoodsSold: Cents;
  readonly grossProfit: Cents;
  readonly expenses: Cents;
  readonly inventoryLosses: Cents;
  readonly netProfit: Cents;
}

/** Utilidad de un ítem vendido: cantidad × (precio cobrado − costo real del lote). */
export function itemProfit(item: SoldItem): Cents {
  assertQuantity(item.quantity);
  return cents(item.quantity * (item.unitPrice - item.unitCost));
}

/**
 * Resultado del período:
 *
 *   ventas − costo de lo vendido = ganancia bruta
 *   ganancia bruta − gastos − pérdidas de inventario = ganancia neta
 *
 * Las pérdidas de inventario se valúan al costo real del lote. Un ajuste
 * positivo (por ejemplo, el cuadre encontró una unidad de más) las reduce.
 */
export function calculatePeriodResult(input: PeriodInput): PeriodResult {
  const revenue = sum(input.soldItems.map((item) => lineTotal(item.quantity, item.unitPrice)));
  const costOfGoodsSold = sum(input.soldItems.map((item) => lineTotal(item.quantity, item.unitCost)));
  const expenses = sum(input.expenses);
  const inventoryLosses = -sum(
    input.inventoryAdjustments.map((adjustment) => adjustment.quantity * adjustment.unitCost),
  );
  const grossProfit = revenue - costOfGoodsSold;
  return {
    revenue: cents(revenue),
    costOfGoodsSold: cents(costOfGoodsSold),
    grossProfit: cents(grossProfit),
    expenses: cents(expenses),
    inventoryLosses: cents(inventoryLosses),
    netProfit: cents(grossProfit - expenses - inventoryLosses),
  };
}

/**
 * Ganancia acumulada sin repartir (§4.13): suma de las ganancias netas de
 * todos los períodos menos lo ya repartido. Lo que no se reparte queda como
 * reinversión y sigue sumando.
 */
export function undistributedProfit(netProfits: readonly Cents[], distributed: readonly Cents[]): Cents {
  return cents(sum(netProfits) - sum(distributed));
}

function lineTotal(quantity: number, amount: Cents): number {
  assertQuantity(quantity);
  return quantity * amount;
}

function assertQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity <= 0)
    throw new RangeError("La cantidad vendida debe ser un entero mayor a 0.");
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
