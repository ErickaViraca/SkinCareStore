/**
 * Reglas de arquitectura: qué carpeta puede importar a cuál.
 * Implementa las capas descritas en docs/guias/backend.md y frontend.md.
 * Se verifica en CI con `npm run arch`. Si una regla falla, el código está en
 * la capa equivocada: se mueve el código, no se relaja la regla.
 *
 *   app ──▶ controllers ──▶ services ──▶ repositories ──▶ db
 *    │           │              │
 *    ▼           ▼              ▼
 *  components   dto          domain (lógica pura)
 */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "sin-dependencias-circulares",
      comment: "Ningún módulo puede depender (directa o indirectamente) de sí mismo.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "domain-es-puro",
      comment: "src/domain es lógica pura: no conoce base de datos, servidor, Next.js ni la UI.",
      severity: "error",
      from: { path: "^src/domain" },
      to: { path: "^src/(server|db|app|components)|^node_modules/(next|react|pg|@electric-sql)" },
    },
    {
      name: "repositorios-solo-usan-db",
      comment: "Los repositorios no llaman servicios ni controladores.",
      severity: "error",
      from: { path: "^src/server/repositories" },
      to: { path: "^src/(server/(services|controllers)|app|components)" },
    },
    {
      name: "servicios-no-usan-capas-superiores",
      comment: "Los servicios no conocen a los controladores ni a la UI.",
      severity: "error",
      from: { path: "^src/server/services" },
      to: { path: "^src/(server/controllers|app|components)" },
    },
    {
      name: "controladores-no-saltan-capas",
      comment: "Los controladores usan servicios, nunca repositorios ni la base directamente.",
      severity: "error",
      from: { path: "^src/server/controllers" },
      to: { path: "^src/(server/repositories|db)" },
    },
    {
      name: "solo-repositorios-acceden-a-db",
      comment:
        "Solo los repositorios (y la propia carpeta db) usan el esquema y las consultas. Los servicios pueden usar únicamente src/db/client (la conexión, para abrir transacciones).",
      severity: "error",
      from: { path: "^src/", pathNot: "^src/(server/repositories|server/services|db)" },
      to: { path: "^src/db" },
    },
    {
      name: "servicios-solo-usan-la-conexion",
      comment: "Los servicios no tocan tablas ni migraciones: eso es trabajo de los repositorios.",
      severity: "error",
      from: { path: "^src/server/services" },
      to: { path: "^src/db", pathNot: "^src/db/client" },
    },
    {
      name: "app-no-usa-servicios-ni-repositorios",
      comment: "Las páginas y rutas de Next.js llaman controladores, no servicios ni repositorios.",
      severity: "error",
      from: { path: "^src/app" },
      to: { path: "^src/server/(services|repositories)" },
    },
    {
      name: "componentes-sin-servidor",
      comment: "Los componentes de UI no importan código del servidor ni de la base.",
      severity: "error",
      from: { path: "^src/components" },
      to: { path: "^src/(server|db)" },
    },
    {
      name: "src-no-importa-tests",
      comment: "El código de la aplicación nunca depende de los tests.",
      severity: "error",
      from: { path: "^src/" },
      to: { path: "^tests/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: { exportsFields: ["exports"], conditionNames: ["import", "require", "node", "default"] },
  },
};
