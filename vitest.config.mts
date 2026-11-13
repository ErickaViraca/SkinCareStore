import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Configuración de tests. Hay tres proyectos (ver docs/ESPECIFICACION.md §7):
 *
 * - unit:        tests/unit y tests/property — sin base de datos.
 * - integration: tests/integration — sobre PGlite (Postgres en memoria).
 * - postgres:    tests/postgres — sobre un Postgres real (contenedor en CI).
 *                Necesita la variable DATABASE_URL_TEST.
 */

// `server-only` falla a propósito fuera de Next.js; en los tests se reemplaza por un módulo vacío.
const serverOnlyStub = fileURLToPath(new URL("./tests/helpers/server-only-stub.ts", import.meta.url));

const shared = {
  resolve: { tsconfigPaths: true, alias: { "server-only": serverOnlyStub } },
};

export default defineConfig({
  test: {
    projects: [
      {
        ...shared,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts", "tests/property/**/*.test.ts"],
          environment: "node",
        },
      },
      { ...shared, test: { name: "integration", include: ["tests/integration/**/*.test.ts"], environment: "node" } },
      {
        ...shared,
        test: {
          name: "postgres",
          include: ["tests/postgres/**/*.test.ts"],
          environment: "node",
          fileParallelism: false,
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/domain/**", "src/server/**", "src/lib/**"],
      reporter: ["text", "html"],
      // Mínimos de cobertura.
      thresholds: {
        statements: 85,
        lines: 85,
        functions: 80,
        branches: 80,
        // La lógica de dinero y stock exige más cobertura (etapa 2).
        "src/domain/**": { statements: 95, lines: 95, functions: 95, branches: 95 },
      },
    },
  },
});
