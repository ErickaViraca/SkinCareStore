import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as PreparePhotoModule from "@/components/products/prepare-photo";
import { photoFileProblem, preparePhoto } from "@/components/products/prepare-photo";
import { uploadPhotos } from "@/components/products/upload-photos";
import { fitWithin } from "@/lib/image-size";

vi.mock("@/components/products/prepare-photo", async (importOriginal) => ({
  ...(await importOriginal<typeof PreparePhotoModule>()),
  preparePhoto: vi.fn(async () => new Blob(["x"], { type: "image/webp" })),
}));

describe("fitWithin", () => {
  it("achica el lado más largo a 1600 sin deformar", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("no agranda fotos chicas", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});

describe("photoFileProblem", () => {
  it("acepta JPG, PNG y WebP de hasta 15 MB", () => {
    expect(photoFileProblem({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(photoFileProblem({ type: "image/heic", size: 1000 })).toMatch(/JPG, PNG o WebP/);
    expect(photoFileProblem({ type: "image/png", size: 16 * 1024 * 1024 })).toMatch(/15 MB/);
  });
});

describe("uploadPhotos", () => {
  const photo = (name: string, type = "image/jpeg"): File => new File(["x"], name, { type });
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
  });

  const actions = () => ({
    prepare: vi.fn(async () => ({
      ok: true as const,
      data: { uploadUrl: "https://r2/firmado", key: "products/p/k.webp" },
    })),
    register: vi.fn(async () => ({ ok: true as const })),
  });

  it("achica, pide el enlace, sube directo a R2 y registra cada foto", async () => {
    const acts = actions();
    const progress: string[] = [];

    const summary = await uploadPhotos({
      productId: "p",
      files: [photo("a.jpg"), photo("b.jpg")],
      room: 10,
      actions: acts,
      onProgress: (message) => progress.push(message),
    });

    expect(summary).toEqual({ uploaded: 2, problem: null });
    expect(preparePhoto).toHaveBeenCalledTimes(2);
    expect(acts.prepare).toHaveBeenCalledWith({ productId: "p", contentType: "image/webp" });
    expect(fetchMock).toHaveBeenCalledWith("https://r2/firmado", expect.objectContaining({ method: "PUT" }));
    expect(acts.register).toHaveBeenCalledWith({ productId: "p", key: "products/p/k.webp" });
    expect(progress).toEqual(["Subiendo 1 de 2…", "Subiendo 2 de 2…"]);
  });

  it("no pasa del límite y sigue con las demás si una falla", async () => {
    const acts = actions();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 403 }));

    const summary = await uploadPhotos({
      productId: "p",
      files: [photo("a.jpg"), photo("b.jpg"), photo("c.jpg")],
      room: 2,
      actions: acts,
      onProgress: () => undefined,
    });

    expect(summary.uploaded).toBe(1);
    expect(summary.problem).toMatch(/Solo se subieron 2/);
    expect(acts.prepare).toHaveBeenCalledTimes(2);
  });

  it("avisa si el archivo no es una foto aceptada o el servidor lo rechaza", async () => {
    const acts = actions();
    acts.prepare.mockResolvedValueOnce({ ok: false, error: { message: "Máximo 10 fotos." } } as never);

    const rejected = await uploadPhotos({
      productId: "p",
      files: [photo("x.heic", "image/heic")],
      room: 10,
      actions: acts,
      onProgress: () => undefined,
    });
    const limited = await uploadPhotos({
      productId: "p",
      files: [photo("a.jpg")],
      room: 10,
      actions: acts,
      onProgress: () => undefined,
    });

    expect(rejected).toEqual({ uploaded: 0, problem: "x.heic: Solo se aceptan fotos JPG, PNG o WebP." });
    expect(limited.problem).toBe("a.jpg: Máximo 10 fotos.");
  });

  it("si el navegador no puede procesar la foto, avisa sin romper", async () => {
    vi.mocked(preparePhoto).mockRejectedValueOnce(new Error("sin canvas"));
    const summary = await uploadPhotos({
      productId: "p",
      files: [photo("a.jpg")],
      room: 10,
      actions: actions(),
      onProgress: () => undefined,
    });
    expect(summary.problem).toMatch(/No se pudo procesar/);
  });
});
