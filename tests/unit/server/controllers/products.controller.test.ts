import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadProductDetail, loadProductFormOptions, loadProducts } from "@/server/controllers/products.controller";
import { requireAdmin } from "@/server/controllers/session.controller";
import { NotFoundError } from "@/server/errors/app-error";
import { listBrands } from "@/server/services/brands.service";
import { listCategories } from "@/server/services/categories.service";
import { getProductDetail, listProducts } from "@/server/services/products.service";

vi.mock("@/server/controllers/session.controller", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/server/services/products.service", () => ({ listProducts: vi.fn(), getProductDetail: vi.fn() }));
vi.mock("@/server/services/brands.service", () => ({ listBrands: vi.fn() }));
vi.mock("@/server/services/categories.service", () => ({ listCategories: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

const ID = "6f1c1f9e-8d43-4a43-9b0e-1d2b3c4d5e6f";

describe("lecturas de productos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("la lista verifica la sesión", async () => {
    vi.mocked(listProducts).mockResolvedValue([]);
    await expect(loadProducts()).resolves.toEqual([]);
    expect(requireAdmin).toHaveBeenCalledOnce();
  });

  it("un id inválido o inexistente muestra 'no encontrado'", async () => {
    await expect(loadProductDetail("no-es-id")).rejects.toThrow("NOT_FOUND");
    vi.mocked(getProductDetail).mockRejectedValue(new NotFoundError("No existe."));
    await expect(loadProductDetail(ID)).rejects.toThrow("NOT_FOUND");
  });

  it("otros errores siguen su curso", async () => {
    vi.mocked(getProductDetail).mockRejectedValue(new Error("base caída"));
    await expect(loadProductDetail(ID)).rejects.toThrow("base caída");
  });

  it("las opciones traen solo marcas y categorías activas, por nombre y con su padre", async () => {
    vi.mocked(listBrands).mockResolvedValue([
      { id: "2", name: "Isdin", slug: "isdin", archivedAt: null, productCount: 0 },
      { id: "1", name: "Avène", slug: "avene", archivedAt: null, productCount: 0 },
      { id: "3", name: "Vieja", slug: "vieja", archivedAt: new Date(), productCount: 0 },
    ]);
    vi.mocked(listCategories).mockResolvedValue([
      {
        id: "c2",
        name: "Sérums",
        slug: "serums",
        parentId: "c1",
        parentName: "Rostro",
        archivedAt: null,
        productCount: 0,
      },
      { id: "c1", name: "Rostro", slug: "rostro", parentId: null, parentName: null, archivedAt: null, productCount: 0 },
    ]);

    expect(await loadProductFormOptions()).toEqual({
      brands: [
        { id: "1", label: "Avène" },
        { id: "2", label: "Isdin" },
      ],
      categories: [
        { id: "c1", label: "Rostro" },
        { id: "c2", label: "Rostro › Sérums" },
      ],
    });
  });
});
