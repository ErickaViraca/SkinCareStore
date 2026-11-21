import { refresh } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  archiveBrandAction,
  archiveCategoryAction,
  createBrandAction,
  createCategoryAction,
  restoreBrandAction,
  restoreCategoryAction,
  updateBrandAction,
  updateCategoryAction,
} from "@/server/controllers/taxonomy.actions";
import { requireAdminSession } from "@/server/controllers/session.controller";
import { UnauthorizedError } from "@/server/errors/app-error";
import * as brandsService from "@/server/services/brands.service";
import * as categoriesService from "@/server/services/categories.service";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/server/controllers/session.controller", () => ({ requireAdminSession: vi.fn() }));
vi.mock("@/server/services/brands.service", () => ({
  createBrand: vi.fn(),
  renameBrand: vi.fn(),
  archiveBrand: vi.fn(),
  restoreBrand: vi.fn(),
}));
vi.mock("@/server/services/categories.service", () => ({
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  archiveCategory: vi.fn(),
  restoreCategory: vi.fn(),
}));

const ID = "6f1c1f9e-8d43-4a43-9b0e-1d2b3c4d5e6f";
const ADMIN = { id: ID, email: "ericka@example.com", name: "Ericka" };

/** Cada acción con una entrada válida y el servicio que debe llamar. */
const CASES = [
  { name: "createBrand", run: () => createBrandAction({ name: "Isdin" }), service: brandsService.createBrand },
  {
    name: "updateBrand",
    run: () => updateBrandAction({ id: ID, name: "Isdin" }),
    service: brandsService.renameBrand,
  },
  { name: "archiveBrand", run: () => archiveBrandAction(ID), service: brandsService.archiveBrand },
  { name: "restoreBrand", run: () => restoreBrandAction(ID), service: brandsService.restoreBrand },
  {
    name: "createCategory",
    run: () => createCategoryAction({ name: "Rostro", parentId: "" }),
    service: categoriesService.createCategory,
  },
  {
    name: "updateCategory",
    run: () => updateCategoryAction({ id: ID, name: "Rostro", parentId: "" }),
    service: categoriesService.updateCategory,
  },
  { name: "archiveCategory", run: () => archiveCategoryAction(ID), service: categoriesService.archiveCategory },
  { name: "restoreCategory", run: () => restoreCategoryAction(ID), service: categoriesService.restoreCategory },
];

describe("acciones de marcas y categorías", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN);
  });

  describe.each(CASES)("$name", ({ run, service }) => {
    it("sin sesión se rechaza y no toca la base", async () => {
      vi.mocked(requireAdminSession).mockRejectedValue(new UnauthorizedError());

      const result = await run();

      expect(result).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
      expect(service).not.toHaveBeenCalled();
      expect(refresh).not.toHaveBeenCalled();
    });

    it("con sesión llama al servicio y refresca la pantalla", async () => {
      const result = await run();

      expect(result).toEqual({ ok: true, data: null });
      expect(service).toHaveBeenCalledOnce();
      expect(refresh).toHaveBeenCalledOnce();
    });
  });

  it("pasa al servicio los datos ya validados", async () => {
    await updateCategoryAction({ id: ID, name: "  Rostro ", parentId: "" });
    expect(categoriesService.updateCategory).toHaveBeenCalledWith(ID, { name: "Rostro", parentId: null });

    await updateBrandAction({ id: ID, name: " Isdin " });
    expect(brandsService.renameBrand).toHaveBeenCalledWith(ID, { name: "Isdin" });
  });

  it("una entrada inválida vuelve con errores por campo, sin llamar al servicio", async () => {
    const result = await createBrandAction({ name: "" });

    expect(result).toEqual({
      ok: false,
      error: { code: "VALIDATION", message: "Revisa los datos marcados.", fieldErrors: { name: "Escribe el nombre." } },
    });
    expect(brandsService.createBrand).not.toHaveBeenCalled();
  });

  it("un id inválido se rechaza", async () => {
    const result = await archiveBrandAction("1; DROP TABLE brands");
    expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION" } });
    expect(brandsService.archiveBrand).not.toHaveBeenCalled();
  });
});
