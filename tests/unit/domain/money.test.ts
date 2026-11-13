import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { cents, formatBs, parseDbMoney, toDbMoney } from "@/domain/money";

describe("cents", () => {
  it("acepta enteros", () => {
    expect(cents(28990)).toBe(28990);
  });

  it.each([0.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 60])("rechaza %s", (value) => {
    expect(() => cents(value)).toThrow(RangeError);
  });
});

describe("parseDbMoney", () => {
  it.each([
    ["289.90", 28990],
    ["289.9", 28990],
    ["100", 10000],
    ["0.05", 5],
    ["-12.50", -1250],
    [" 7.00 ", 700],
  ])("lee %s como %i centavos", (text, expected) => {
    expect(parseDbMoney(text)).toBe(expected);
  });

  it.each(["", "abc", "1.234", "1,50", "1e3", "--1"])("rechaza el formato %j", (text) => {
    expect(() => parseDbMoney(text)).toThrow(RangeError);
  });

  it("ida y vuelta: leer lo que se escribe devuelve el mismo monto", () => {
    fc.assert(
      fc.property(fc.integer({ min: -9_999_999_999, max: 9_999_999_999 }), (value) => {
        expect(parseDbMoney(toDbMoney(cents(value)))).toBe(value);
      }),
    );
  });
});

describe("toDbMoney", () => {
  it.each([
    [28990, "289.90"],
    [5, "0.05"],
    [0, "0.00"],
    [-1250, "-12.50"],
  ])("escribe %i centavos como %s", (value, expected) => {
    expect(toDbMoney(cents(value))).toBe(expected);
  });
});

describe("formatBs", () => {
  it("muestra el monto con formato boliviano", () => {
    expect(formatBs(cents(123450))).toBe("Bs 1.234,50");
    expect(formatBs(cents(28990))).toBe("Bs 289,90");
    expect(formatBs(cents(0))).toBe("Bs 0,00");
  });
});
