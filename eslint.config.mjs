import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import sonarjs from "eslint-plugin-sonarjs";

/**
 * Reglas de código. Cada regla agregada aquí responde a un punto de las guías
 * en docs/guias/. Si una regla molesta, se discute y se cambia aquí; no se
 * desactiva en el código salvo con un comentario que explique por qué.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  sonarjs.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mts}"],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // Guía TypeScript: nada de `any`, tipos explícitos en lo exportado, imports de tipos separados.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // Promesas siempre esperadas o manejadas.
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      // Los `switch` sobre uniones deben cubrir todos los casos.
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      // Guía backend: funciones pequeñas y de una sola responsabilidad.
      "sonarjs/cognitive-complexity": ["error", 15],
      "max-params": ["error", 4],
      "max-lines-per-function": ["warn", { max: 60, skipBlankLines: true, skipComments: true }],
      "max-depth": ["error", 3],
      // Logs solo a través del logger del servidor.
      "no-console": "error",
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
    },
  },
  {
    // Las columnas de Drizzle tienen tipos inferidos muy largos y propios de la librería;
    // escribirlos a mano no aporta seguridad y dificulta leer el esquema.
    files: ["src/db/schema/**/*.ts"],
    rules: { "@typescript-eslint/explicit-module-boundary-types": "off" },
  },
  {
    // Los tests pueden ser más largos y usar valores de prueba.
    files: ["tests/**/*.ts"],
    rules: {
      "max-lines-per-function": "off",
      "sonarjs/no-hardcoded-passwords": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
  },
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "*.config.{js,cjs,mjs}",
    ".dependency-cruiser.cjs",
  ]),
]);

export default eslintConfig;
