import { describe, expect, it } from "vitest";

import { NEUTRALS, buildTheme } from "@/components/theme/build-theme";
import { DEFAULT_PALETTE, ON_COLOR } from "@/lib/branding";

describe("buildTheme", () => {
  it("toma cada color de la paleta de la tienda", () => {
    const { palette } = buildTheme(DEFAULT_PALETTE);

    expect(palette.background.default).toBe(DEFAULT_PALETTE.background);
    expect(palette.background.paper).toBe(NEUTRALS.surface);
    expect(palette.text.primary).toBe(DEFAULT_PALETTE.text);
    expect(palette.primary.main).toBe(DEFAULT_PALETTE.primary);
    expect(palette.secondary.main).toBe(DEFAULT_PALETTE.secondary);
    expect(palette.error.main).toBe(DEFAULT_PALETTE.danger);
    expect(palette.nav.main).toBe(DEFAULT_PALETTE.nav);
    expect(palette.accent.main).toBe(DEFAULT_PALETTE.accent);
  });

  it("usa letras fijas encima de cada color (no se calculan según el fondo)", () => {
    const { palette } = buildTheme({ ...DEFAULT_PALETTE, primary: "#FFFFFF", nav: "#FFFFFF" });

    expect(palette.primary.contrastText).toBe("#FFFFFF");
    expect(palette.nav.contrastText).toBe(ON_COLOR.nav);
    expect(palette.error.contrastText).toBe(ON_COLOR.danger);
  });

  it("cambia de celular a computadora en 760 px", () => {
    expect(buildTheme(DEFAULT_PALETTE).breakpoints.values.md).toBe(760);
  });
});
