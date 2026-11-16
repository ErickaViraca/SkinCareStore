<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Reglas del proyecto Soleil

Antes de escribir código, leer y seguir:

1. `docs/ESPECIFICACION.md` — qué hace el sistema y sus reglas de negocio (aprobada; los cambios se discuten antes).
2. `docs/guias/backend.md` — capas, DTOs, errores, logs, tests.
3. `docs/guias/frontend.md` — componentes reutilizables, servidor/cliente, formularios.
4. `docs/UI.md` — cómo debe verse cada pantalla (bocetos aprobados, colores, tipografía).
5. `docs/guias/typescript.md` — tipos, dinero en centavos, validación, nombres (código siempre en inglés; textos de la interfaz, comentarios y documentación en español).

Obligatorio en cada cambio:

- Trabajar en una rama y proponer un pull request; nunca subir directo a `main`.
- Agregar o actualizar tests en `tests/` (nunca contra Neon).
- Correr `npm run check` y dejarlo en verde antes de abrir el PR.
