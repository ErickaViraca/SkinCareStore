import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_BRANDING } from "@/lib/branding";
import { auth } from "@/server/auth/auth";
import { loadBranding, requireAdmin, requireAdminSession } from "@/server/controllers/session.controller";
import { UnauthorizedError } from "@/server/errors/app-error";
import { findActiveAdmin } from "@/server/services/access.service";
import { getBranding } from "@/server/services/branding.service";

vi.mock("@/server/auth/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/services/access.service", () => ({ findActiveAdmin: vi.fn() }));
vi.mock("@/server/services/branding.service", () => ({ getBranding: vi.fn() }));
vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

const ADMIN = { id: "6f1c1f9e-8d43-4a43-9b0e-1d2b3c4d5e6f", email: "ericka@example.com", name: "Ericka" };
const mockedAuth = vi.mocked(auth as unknown as () => Promise<{ user?: { id?: string } } | null>);

describe("controlador de sesión", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve la administradora activa de la sesión", async () => {
    mockedAuth.mockResolvedValue({ user: { id: ADMIN.id } });
    vi.mocked(findActiveAdmin).mockResolvedValue(ADMIN);

    await expect(requireAdmin()).resolves.toEqual(ADMIN);
    expect(findActiveAdmin).toHaveBeenCalledWith(ADMIN.id);
  });

  it("sin sesión lleva a /login", async () => {
    mockedAuth.mockResolvedValue(null);
    vi.mocked(findActiveAdmin).mockResolvedValue(null);

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/login");
  });

  it("si la administradora fue desactivada lleva a /login", async () => {
    mockedAuth.mockResolvedValue({ user: { id: ADMIN.id } });
    vi.mocked(findActiveAdmin).mockResolvedValue(null);

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/login");
  });

  it("lee la identidad visual en cada pedido", async () => {
    vi.mocked(getBranding).mockResolvedValue(DEFAULT_BRANDING);
    await expect(loadBranding()).resolves.toEqual(DEFAULT_BRANDING);
  });

  describe("requireAdminSession (para las acciones)", () => {
    it("devuelve la administradora activa", async () => {
      mockedAuth.mockResolvedValue({ user: { id: ADMIN.id } });
      vi.mocked(findActiveAdmin).mockResolvedValue(ADMIN);
      await expect(requireAdminSession()).resolves.toEqual(ADMIN);
    });

    it("sin sesión válida lanza UnauthorizedError en vez de redirigir", async () => {
      mockedAuth.mockResolvedValue(null);
      vi.mocked(findActiveAdmin).mockResolvedValue(null);
      await expect(requireAdminSession()).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });
});
