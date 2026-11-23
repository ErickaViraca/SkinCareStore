import { refresh } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  assignPhotoVariantAction,
  deletePhotoAction,
  movePhotoAction,
  preparePhotoUploadAction,
  registerPhotoAction,
} from "@/server/controllers/photos.actions";
import { requireAdminSession } from "@/server/controllers/session.controller";
import { UnauthorizedError } from "@/server/errors/app-error";
import * as service from "@/server/services/photos.service";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/server/controllers/session.controller", () => ({ requireAdminSession: vi.fn() }));
vi.mock("@/server/services/photos.service", () => ({
  prepareUpload: vi.fn(async () => ({ uploadUrl: "https://r2/firmado", key: "k" })),
  registerUpload: vi.fn(),
  movePhoto: vi.fn(),
  assignPhotoVariant: vi.fn(),
  deletePhoto: vi.fn(),
}));

const ID = "6f1c1f9e-8d43-4a43-9b0e-1d2b3c4d5e6f";

const CASES = [
  {
    name: "preparePhotoUpload",
    run: () => preparePhotoUploadAction({ productId: ID, contentType: "image/webp" }),
    service: service.prepareUpload,
    refreshes: false,
  },
  {
    name: "registerPhoto",
    run: () => registerPhotoAction({ productId: ID, key: "products/x.webp" }),
    service: service.registerUpload,
    refreshes: true,
  },
  {
    name: "movePhoto",
    run: () => movePhotoAction({ id: ID, direction: "later" }),
    service: service.movePhoto,
    refreshes: true,
  },
  {
    name: "assignPhotoVariant",
    run: () => assignPhotoVariantAction({ id: ID, variantId: "" }),
    service: service.assignPhotoVariant,
    refreshes: true,
  },
  { name: "deletePhoto", run: () => deletePhotoAction(ID), service: service.deletePhoto, refreshes: true },
];

describe("acciones de fotos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminSession).mockResolvedValue({ id: ID, email: "e@example.com", name: "Ericka" });
  });

  describe.each(CASES)("$name", ({ run, service: call, refreshes }) => {
    it("sin sesión se rechaza y no hace nada", async () => {
      vi.mocked(requireAdminSession).mockRejectedValue(new UnauthorizedError());
      expect(await run()).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
      expect(call).not.toHaveBeenCalled();
    });

    it("con sesión llama al servicio", async () => {
      expect(await run()).toMatchObject({ ok: true });
      expect(call).toHaveBeenCalledOnce();
      expect(vi.mocked(refresh).mock.calls).toHaveLength(refreshes ? 1 : 0);
    });
  });

  it("el enlace firmado vuelve a la pantalla", async () => {
    expect(await preparePhotoUploadAction({ productId: ID, contentType: "image/webp" })).toEqual({
      ok: true,
      data: { uploadUrl: "https://r2/firmado", key: "k" },
    });
  });

  it("rechaza tipos que no son fotos; un tono vacío significa todo el producto", async () => {
    expect(await preparePhotoUploadAction({ productId: ID, contentType: "application/pdf" })).toMatchObject({
      ok: false,
      error: { code: "VALIDATION" },
    });
    await assignPhotoVariantAction({ id: ID, variantId: "" });
    expect(service.assignPhotoVariant).toHaveBeenCalledWith(ID, null);
  });
});
