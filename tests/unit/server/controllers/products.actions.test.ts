import { refresh } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addVariantAction,
  archiveProductAction,
  archiveVariantAction,
  createProductAction,
  restoreProductAction,
  restoreVariantAction,
  updateProductAction,
  updateVariantAction,
} from "@/server/controllers/products.actions";
import { requireAdminSession } from "@/server/controllers/session.controller";
import { UnauthorizedError } from "@/server/errors/app-error";
import * as service from "@/server/services/products.service";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/server/controllers/session.controller", () => ({ requireAdminSession: vi.fn() }));
vi.mock("@/server/services/products.service", () => ({
  createProduct: vi.fn(async () => ({ id: "nuevo" })),
  updateProduct: vi.fn(),
  archiveProduct: vi.fn(),
  restoreProduct: vi.fn(),
  addVariant: vi.fn(),
  updateVariant: vi.fn(),
  archiveVariant: vi.fn(),
  restoreVariant: vi.fn(),
}));

const ID = "6f1c1f9e-8d43-4a43-9b0e-1d2b3c4d5e6f";
const PRODUCT = { name: "Effaclar", brandId: ID, categoryId: ID, skinTypes: [] };
const VARIANT = { salePrice: "289,90" };

const CASES = [
  {
    name: "createProduct",
    run: () => createProductAction({ ...PRODUCT, variant: VARIANT }),
    service: service.createProduct,
  },
  { name: "updateProduct", run: () => updateProductAction({ ...PRODUCT, id: ID }), service: service.updateProduct },
  { name: "archiveProduct", run: () => archiveProductAction(ID), service: service.archiveProduct },
  { name: "restoreProduct", run: () => restoreProductAction(ID), service: service.restoreProduct },
  { name: "addVariant", run: () => addVariantAction({ productId: ID, variant: VARIANT }), service: service.addVariant },
  {
    name: "updateVariant",
    run: () => updateVariantAction({ id: ID, variant: VARIANT }),
    service: service.updateVariant,
  },
  { name: "archiveVariant", run: () => archiveVariantAction(ID), service: service.archiveVariant },
  { name: "restoreVariant", run: () => restoreVariantAction(ID), service: service.restoreVariant },
];

describe("acciones de productos y variantes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminSession).mockResolvedValue({ id: ID, email: "e@example.com", name: "Ericka" });
  });

  describe.each(CASES)("$name", ({ run, service: serviceCall }) => {
    it("sin sesión se rechaza y no toca la base", async () => {
      vi.mocked(requireAdminSession).mockRejectedValue(new UnauthorizedError());
      expect(await run()).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
      expect(serviceCall).not.toHaveBeenCalled();
      expect(refresh).not.toHaveBeenCalled();
    });

    it("con sesión llama al servicio y refresca la pantalla", async () => {
      expect(await run()).toMatchObject({ ok: true });
      expect(serviceCall).toHaveBeenCalledOnce();
      expect(refresh).toHaveBeenCalledOnce();
    });
  });

  it("crear devuelve el id del producto nuevo y pasa los montos en centavos", async () => {
    expect(await createProductAction({ ...PRODUCT, variant: VARIANT })).toEqual({ ok: true, data: { id: "nuevo" } });
    expect(service.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Effaclar", variant: expect.objectContaining({ salePrice: 28990 }) }),
    );
  });

  it("una entrada inválida vuelve con errores por campo, sin llamar al servicio", async () => {
    const result = await addVariantAction({ productId: ID, variant: { salePrice: "abc" } });
    expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION" } });
    expect(result.ok ? null : result.error.fieldErrors).toHaveProperty("variant.salePrice");
    expect(service.addVariant).not.toHaveBeenCalled();
  });
});
