import { describe, expect, it } from "vitest";

import { cents } from "@/domain/money";
import {
  type MarginPolicy,
  calculateMinimumPrice,
  calculateRawMinimumPrice,
  decideAutoRaise,
  isPriceAllowed,
  parsePercent,
  resolveMarginPolicy,
} from "@/domain/pricing";
import { Ratio } from "@/domain/ratio";

const STORE_PCT = parsePercent("25");
const pct = (text: string): MarginPolicy => ({ mode: "pct", pct: parsePercent(text) });

describe("parsePercent", () => {
  it.each([
    ["25", Ratio.of(1, 4)],
    ["25.00", Ratio.of(1, 4)],
    ["12.5", Ratio.of(1, 8)],
    ["0", Ratio.of(0)],
  ])("%s → fracción exacta", (text, expected) => {
    expect(parsePercent(text).compare(expected)).toBe(0);
  });

  it.each(["-5", "abc", "1.234", ""])("rechaza %j", (text) => {
    expect(() => parsePercent(text)).toThrow(RangeError);
  });
});

describe("resolveMarginPolicy", () => {
  it("sin modo propio usa el porcentaje de la tienda, aunque la variante tenga uno cargado", () => {
    const policy = resolveMarginPolicy(
      { marginMode: null, marginPct: parsePercent("40"), marginFixed: null },
      STORE_PCT,
    );

    expect(policy).toEqual({ mode: "pct", pct: STORE_PCT });
  });

  it("modo porcentaje: el de la variante o, si falta, el de la tienda", () => {
    expect(
      resolveMarginPolicy({ marginMode: "pct", marginPct: parsePercent("30"), marginFixed: null }, STORE_PCT),
    ).toEqual(pct("30"));
    expect(resolveMarginPolicy({ marginMode: "pct", marginPct: null, marginFixed: null }, STORE_PCT)).toEqual(
      pct("25"),
    );
  });

  it("modos fijo y mayor necesitan el monto fijo", () => {
    expect(resolveMarginPolicy({ marginMode: "fixed", marginPct: null, marginFixed: cents(5000) }, STORE_PCT)).toEqual({
      mode: "fixed",
      fixed: 5000,
    });
    expect(resolveMarginPolicy({ marginMode: "max", marginPct: null, marginFixed: cents(5000) }, STORE_PCT)).toEqual({
      mode: "max",
      pct: STORE_PCT,
      fixed: 5000,
    });
    expect(() => resolveMarginPolicy({ marginMode: "fixed", marginPct: null, marginFixed: null }, STORE_PCT)).toThrow(
      RangeError,
    );
  });
});

describe("calculateMinimumPrice (§4.5)", () => {
  it("costo 200 + 25% = 250 exacto → 250", () => {
    expect(calculateMinimumPrice(Ratio.of(20000), pct("25"))).toBe(25000);
  });

  it("ejemplo de la especificación: costo promedio 233,33… + 25% = 291,67 → 295", () => {
    expect(calculateMinimumPrice(Ratio.of(280000, 12), pct("25"))).toBe(29500);
  });

  it("modo fijo: costo 200 + 50 Bs = 250 → 250", () => {
    expect(calculateMinimumPrice(Ratio.of(20000), { mode: "fixed", fixed: cents(5000) })).toBe(25000);
  });

  it("modo mayor: elige el más alto de los dos", () => {
    // 25% de 200 = 50 → 250; fijo 60 → 260. Gana el fijo.
    expect(calculateMinimumPrice(Ratio.of(20000), { mode: "max", pct: STORE_PCT, fixed: cents(6000) })).toBe(26000);
    // 25% de 400 = 100 → 500; fijo 60 → 460. Gana el porcentaje.
    expect(calculateMinimumPrice(Ratio.of(40000), { mode: "max", pct: STORE_PCT, fixed: cents(6000) })).toBe(50000);
  });

  it("el precio sin redondear es exacto", () => {
    expect(calculateRawMinimumPrice(Ratio.of(280000, 12), pct("25")).compare(Ratio.of(350000, 12))).toBe(0);
  });
});

describe("decideAutoRaise (§4.6)", () => {
  it("sube al mínimo cuando el precio quedó por debajo", () => {
    expect(decideAutoRaise(cents(28000), cents(29500))).toEqual({ raise: true, newPrice: 29500, previousPrice: 28000 });
  });

  it("nunca baja un precio y no hace nada sin precio mínimo", () => {
    expect(decideAutoRaise(cents(32000), cents(29500))).toEqual({ raise: false });
    expect(decideAutoRaise(cents(29500), cents(29500))).toEqual({ raise: false });
    expect(decideAutoRaise(cents(1000), null)).toEqual({ raise: false });
  });
});

describe("isPriceAllowed (§4.6)", () => {
  it("no permite guardar un precio menor al mínimo", () => {
    expect(isPriceAllowed(cents(29499), cents(29500))).toBe(false);
    expect(isPriceAllowed(cents(29500), cents(29500))).toBe(true);
    expect(isPriceAllowed(cents(100), null)).toBe(true);
    expect(isPriceAllowed(cents(-1), null)).toBe(false);
  });
});
