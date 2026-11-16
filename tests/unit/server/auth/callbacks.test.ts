import { beforeEach, describe, expect, it, vi } from "vitest";

import { authCallbacks } from "@/server/auth/callbacks";
import { authorizeAdmin } from "@/server/services/access.service";

vi.mock("@/server/services/access.service", () => ({ authorizeAdmin: vi.fn() }));

const ADMIN = { id: "6f1c1f9e-8d43-4a43-9b0e-1d2b3c4d5e6f", email: "ericka@example.com", name: "Ericka" };
const authorize = vi.mocked(authorizeAdmin);

type SignInParams = Parameters<typeof authCallbacks.signIn>[0];
type JwtParams = Parameters<typeof authCallbacks.jwt>[0];
type SessionParams = Parameters<typeof authCallbacks.session>[0];

const googleAccount = { provider: "google", type: "oidc", providerAccountId: "1" } as SignInParams["account"];

describe("reglas de ingreso (Auth.js)", () => {
  beforeEach(() => {
    authorize.mockReset();
  });

  describe("signIn", () => {
    it("deja entrar si Google verificó el email y la administradora está activa", async () => {
      authorize.mockResolvedValue(ADMIN);
      const allowed = await authCallbacks.signIn({
        account: googleAccount,
        profile: { email: ADMIN.email, email_verified: true },
      } as SignInParams);

      expect(allowed).toBe(true);
      expect(authorize).toHaveBeenCalledWith(ADMIN.email, true);
    });

    it("rechaza si el servicio de acceso no la reconoce", async () => {
      authorize.mockResolvedValue(null);
      const allowed = await authCallbacks.signIn({
        account: googleAccount,
        profile: { email: "otra@example.com", email_verified: true },
      } as SignInParams);
      expect(allowed).toBe(false);
    });

    it("trata como no verificado un email_verified ausente", async () => {
      authorize.mockResolvedValue(null);
      await authCallbacks.signIn({ account: googleAccount, profile: { email: ADMIN.email } } as SignInParams);
      expect(authorize).toHaveBeenCalledWith(ADMIN.email, false);
    });

    it("rechaza cualquier proveedor que no sea Google sin consultar la base", async () => {
      const allowed = await authCallbacks.signIn({
        account: { provider: "github", type: "oauth", providerAccountId: "1" },
      } as SignInParams);
      expect(allowed).toBe(false);
      expect(authorize).not.toHaveBeenCalled();
    });
  });

  describe("jwt", () => {
    it("al ingresar guarda el id y el nombre de la administradora", async () => {
      authorize.mockResolvedValue(ADMIN);
      const token = await authCallbacks.jwt({
        token: { name: "Nombre de Google" },
        profile: { email: ADMIN.email, email_verified: true },
      } as JwtParams);
      expect(token).toMatchObject({ adminId: ADMIN.id, name: ADMIN.name });
    });

    it("en los pedidos siguientes no consulta la base", async () => {
      const token = await authCallbacks.jwt({ token: { adminId: ADMIN.id } } as unknown as JwtParams);
      expect(token).toEqual({ adminId: ADMIN.id });
      expect(authorize).not.toHaveBeenCalled();
    });

    it("no agrega datos si la administradora no está autorizada", async () => {
      authorize.mockResolvedValue(null);
      const token = await authCallbacks.jwt({
        token: {},
        profile: { email: ADMIN.email, email_verified: true },
      } as JwtParams);
      expect(token).toEqual({});
    });
  });

  describe("session", () => {
    it("expone el id de la administradora", () => {
      const session = authCallbacks.session({
        session: { user: { name: "Ericka" }, expires: "" },
        token: { adminId: ADMIN.id },
      } as unknown as SessionParams);
      expect(session.user.id).toBe(ADMIN.id);
    });

    it("sin id en el token deja el id vacío (requireAdmin lo rechaza)", () => {
      const session = authCallbacks.session({
        session: { user: {}, expires: "" },
        token: {},
      } as unknown as SessionParams);
      expect(session.user.id).toBe("");
    });
  });
});
