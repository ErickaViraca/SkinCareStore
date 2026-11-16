import { describe, expect, it } from "vitest";

import { NAV_GROUPS, findActiveHref } from "@/components/layout/nav-items";

const HREFS = ["/", "/ventas", "/ventas/nueva", "/productos"];

describe("findActiveHref", () => {
  it("Inicio solo está activo en la raíz", () => {
    expect(findActiveHref(HREFS, "/")).toBe("/");
    expect(findActiveHref(["/"], "/productos")).toBeNull();
  });

  it("marca la sección también en sus subpáginas", () => {
    expect(findActiveHref(HREFS, "/productos/123")).toBe("/productos");
  });

  it("elige el ítem más específico", () => {
    expect(findActiveHref(HREFS, "/ventas/nueva")).toBe("/ventas/nueva");
    expect(findActiveHref(HREFS, "/ventas/45")).toBe("/ventas");
  });

  it("no confunde rutas que solo comparten el comienzo", () => {
    expect(findActiveHref(HREFS, "/productos-archivados")).toBeNull();
  });
});

describe("menú del panel", () => {
  it("tiene los cuatro grupos de la guía visual y rutas únicas", () => {
    const hrefs = NAV_GROUPS.flat().map((item) => item.href);
    expect(NAV_GROUPS).toHaveLength(4);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
