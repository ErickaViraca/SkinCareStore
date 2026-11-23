import { afterEach, describe, expect, it, vi } from "vitest";

import { R2PhotoStorage } from "@/server/storage/photo-storage";

const CONFIG = {
  accountId: "cuenta123",
  accessKeyId: "AKIAEJEMPLO",
  secretAccessKey: "secreto-de-prueba",
  bucket: "soleil-fotos",
  publicUrl: "https://pub-abc.r2.dev",
};

describe("R2PhotoStorage", () => {
  it("firma un enlace de subida de 5 minutos para el archivo y su tipo", async () => {
    const storage = new R2PhotoStorage(CONFIG);
    const url = new URL(await storage.createUploadUrl("products/p/foto.webp", "image/webp"));

    expect(url.origin).toBe("https://cuenta123.r2.cloudflarestorage.com");
    expect(url.pathname).toBe("/soleil-fotos/products/p/foto.webp");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("300");
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
    expect(url.searchParams.get("X-Amz-SignedHeaders")).toContain("content-type");
    // La clave secreta nunca viaja en el enlace.
    expect(url.toString()).not.toContain(CONFIG.secretAccessKey);
  });

  it("describe un archivo con su tamaño y tipo, o null si no existe", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, { status: 200, headers: { "content-length": "1234", "content-type": "image/webp" } }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    const storage = new R2PhotoStorage(CONFIG, fetcher);

    await expect(storage.describe("k")).resolves.toEqual({ size: 1234, contentType: "image/webp" });
    await expect(storage.describe("k")).resolves.toBeNull();
    await expect(storage.describe("k")).rejects.toThrow(/500/);
    const firstRequest = fetcher.mock.calls[0]?.[0] as Request;
    expect(firstRequest.method).toBe("HEAD");
    expect(firstRequest.headers.get("authorization")).toMatch(/^AWS4-HMAC-SHA256/);
  });

  it("borra un archivo; si ya no existe no es error", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 403 }));
    const storage = new R2PhotoStorage(CONFIG, fetcher);

    await expect(storage.remove("k")).resolves.toBeUndefined();
    await expect(storage.remove("k")).resolves.toBeUndefined();
    await expect(storage.remove("k")).rejects.toThrow(/403/);
    expect((fetcher.mock.calls[0]?.[0] as Request).method).toBe("DELETE");
  });

  it("arma la dirección pública", () => {
    expect(new R2PhotoStorage(CONFIG).publicUrl("products/p/f.webp")).toBe("https://pub-abc.r2.dev/products/p/f.webp");
  });
});

describe("getPhotoStorage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("sin las variables de R2 devuelve null (el panel lo avisa)", async () => {
    vi.stubEnv("R2_ACCOUNT_ID", "");
    const { getPhotoStorage } = await import("@/server/storage/photo-storage");
    expect(getPhotoStorage()).toBeNull();
  });

  it("con las variables crea el almacenamiento y quita la barra final de la URL pública", async () => {
    vi.stubEnv("R2_ACCOUNT_ID", CONFIG.accountId);
    vi.stubEnv("R2_ACCESS_KEY_ID", CONFIG.accessKeyId);
    vi.stubEnv("R2_SECRET_ACCESS_KEY", CONFIG.secretAccessKey);
    vi.stubEnv("R2_PHOTOS_BUCKET", CONFIG.bucket);
    vi.stubEnv("R2_PUBLIC_URL", "https://pub-abc.r2.dev/");
    const { getPhotoStorage } = await import("@/server/storage/photo-storage");
    expect(getPhotoStorage()?.publicUrl("x.webp")).toBe("https://pub-abc.r2.dev/x.webp");
  });
});
