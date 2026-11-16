# Soleil · Sistema de gestión

Panel privado para administrar la tienda de dermocosmética **Soleil**: productos, compras, ventas, stock, precios, ofertas por vencimiento, dinero, capital de las socias, gastos y reportes.

- **Especificación:** [docs/ESPECIFICACION.md](docs/ESPECIFICACION.md)
- **Guía visual (bocetos aprobados):** [docs/UI.md](docs/UI.md)
- **Configuración de servicios (Neon, Google, R2):** [docs/CONFIGURACION-SERVICIOS.md](docs/CONFIGURACION-SERVICIOS.md)
- **Guías de código (de lectura obligatoria antes de programar):**
  - [Backend](docs/guias/backend.md)
  - [Frontend](docs/guias/frontend.md)
  - [TypeScript](docs/guias/typescript.md)

## Tecnologías

Next.js 16 (App Router) · React 19 · TypeScript (estricto) · Material UI · Postgres (Neon) con Drizzle · Vitest + fast-check + PGlite · GitHub Actions.

## Requisitos

- Node.js 24 (ver `.nvmrc`; funciona desde 22.12)
- npm

## Primeros pasos

```bash
npm install
cp .env.example .env.local   # completar los valores
npm run dev                  # http://localhost:3000
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm test` | Tests unitarios, de propiedades e integración (PGlite, en memoria) |
| `npm run test:watch` | Lo mismo, repitiendo al guardar |
| `npm run test:coverage` | Tests con reporte de cobertura |
| `npm run test:postgres` | Tests de concurrencia y permisos (necesita `DATABASE_URL_TEST`) |
| `npm run lint` | Reglas de código (ESLint) |
| `npm run format` | Da formato al código (Prettier) |
| `npm run typecheck` | Revisión de tipos (TypeScript) |
| `npm run arch` | Reglas de capas y dependencias circulares (dependency-cruiser) |
| `npm run unused` | Código, exports y dependencias sin usar (knip) |
| `npm run db:generate` | Genera una migración a partir de cambios en `src/db/schema` |
| `npm run db:check` | Verifica que las migraciones sean coherentes |
| `npm run db:migrate` | Aplica las migraciones a la base de `DATABASE_URL` (desarrollo o producción) |
| `npm run check` | Todo lo anterior salvo build y Postgres: **correr antes de abrir un PR** |

## Estructura

```
src/
  app/                 Páginas y rutas (Next.js)
  components/          Componentes de interfaz reutilizables
  domain/              Lógica de negocio pura (sin base de datos)
  lib/                 Utilidades generales (dinero, fechas)
  server/
    controllers/       Entrada: Server Actions y Route Handlers
    services/          Casos de uso y transacciones
    repositories/      Acceso a la base (DAO)
    dto/               Datos de entrada y salida
    mappers/           Conversión entidad → DTO
    errors/            Errores tipados
    logger/            Logs estructurados
  db/                  Esquema, migraciones, vistas y permisos
tests/
  unit/                Tests unitarios
  property/            Tests con secuencias aleatorias
  integration/         Caminos completos sobre PGlite
  postgres/            Concurrencia y permisos sobre Postgres real
  helpers/             Utilidades de tests
docs/                  Especificación y guías
```

## Flujo de trabajo

1. Crear una rama desde `main`.
2. Programar siguiendo las guías y con tests.
3. Correr `npm run check`.
4. Abrir un pull request: GitHub Actions corre `calidad`, `tests` y `tests-postgres`.
5. Con todo en ✅, revisar y mergear. `main` está protegida: no se puede mergear con verificaciones en rojo.

## Tests de Postgres en local (opcional)

Los tests de `tests/postgres` necesitan un Postgres real **temporal** (nunca Neon). Con Docker:

```bash
docker run --rm -d --name soleil-test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=soleil_test -p 5432:5432 postgres:17
DATABASE_URL_TEST=postgresql://postgres:test@localhost:5432/soleil_test npm run test:postgres
docker stop soleil-test
```

Sin `DATABASE_URL_TEST`, estos tests se saltan en local; en CI siempre corren.
