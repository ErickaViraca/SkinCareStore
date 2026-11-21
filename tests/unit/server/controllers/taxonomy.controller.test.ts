import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAdmin } from "@/server/controllers/session.controller";
import { loadBrands, loadCategories } from "@/server/controllers/taxonomy.controller";
import { listBrands } from "@/server/services/brands.service";
import { listCategories } from "@/server/services/categories.service";

vi.mock("@/server/controllers/session.controller", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/server/services/brands.service", () => ({ listBrands: vi.fn() }));
vi.mock("@/server/services/categories.service", () => ({ listCategories: vi.fn() }));

describe("lecturas de marcas y categorías", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("verifican la sesión y devuelven DTO", async () => {
    vi.mocked(listBrands).mockResolvedValue([
      { id: "1", name: "Isdin", slug: "isdin", archivedAt: null, productCount: 2 },
    ]);
    vi.mocked(listCategories).mockResolvedValue([
      {
        id: "2",
        name: "Rostro",
        slug: "rostro",
        parentId: null,
        parentName: null,
        archivedAt: new Date(),
        productCount: 0,
      },
    ]);

    await expect(loadBrands()).resolves.toEqual([
      { id: "1", name: "Isdin", slug: "isdin", archived: false, productCount: 2 },
    ]);
    await expect(loadCategories()).resolves.toMatchObject([{ id: "2", archived: true }]);
    expect(requireAdmin).toHaveBeenCalledTimes(2);
  });

  it("sin sesión no leen la base (requireAdmin redirige)", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("REDIRECT:/login"));

    await expect(loadBrands()).rejects.toThrow("REDIRECT:/login");
    expect(listBrands).not.toHaveBeenCalled();
  });
});
