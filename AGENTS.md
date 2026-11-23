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

- Trabajar en una rama y proponer un pull request **contra `develop`** (ambiente de pruebas); nunca subir directo a `develop` ni a `main`.
- Producción se actualiza solo con un PR **`develop` → `main`**, cuando lo probado en pruebas está bien.
- Agregar o actualizar tests en `tests/` (nunca contra Neon).
- Correr `npm run check` y dejarlo en verde antes de abrir el PR.

## Ambientes

| Ambiente | Rama | Dirección | Base (Neon) | Fotos (R2) |
|---|---|---|---|---|
| Producción | `main` | `soleil-admin-panel.vercel.app` | rama `production` | `soleil-fotos` |
| Pruebas | `develop` | `soleil-admin-pruebas.vercel.app` | rama `desarrollo` | `soleil-fotos-pruebas` |

Una vez que haya ventas reales, **ningún dato viaja de Pruebas a Producción**: solo código, por PR. En sentido contrario (Producción → Pruebas) sí, para ensayar con datos reales.

## Acceso a servicios (Vercel, Neon, Cloudflare)

Los conectores dan acceso a toda la cuenta o equipo, no solo a Soleil. Por eso:

1. **Solo los recursos de Soleil.** Nunca leer ni tocar otros proyectos (por ejemplo, Xiaomi), aunque el acceso los muestre.
2. **Producción es de solo lectura.** Cualquier cambio en la base de producción se hace con migraciones revisadas en un PR. Un cambio a mano en producción (Vercel, Neon o R2) solo con la aprobación explícita de la dueña en ese momento.
3. **Pruebas:** se pueden hacer cambios, avisando antes qué se va a hacer.
4. **Nunca borrar** proyectos, ramas, bases, buckets ni despliegues en ningún ambiente, salvo pedido expreso.
5. **Secretos:** nunca pedirlos ni escribirlos en el chat, en GitHub ni en el repositorio. Las claves las carga la dueña directamente en cada servicio.
