# Guía de backend

Reglas que **todo** el código del servidor debe cumplir. Se revisan en cada pull request.
Basada en la documentación oficial de Next.js 16 (`node_modules/next/dist/docs/`), en especial *Data Security*, *Server Actions*, *Error Handling* y *Caching*.

Las reglas marcadas con 🤖 las verifica la máquina en CI (ESLint, dependency-cruiser, knip, TypeScript). Las demás las verificamos al revisar el PR.

---

## 1. Principios

1. **Una función, una responsabilidad.** Cada método hace **una sola cosa** de la lógica. Si para describirlo hace falta un "y" ("valida **y** guarda **y** recalcula"), se divide.
2. **Funciones cortas y planas.** Pocas líneas, pocos niveles de anidación y pocos parámetros. 🤖 (complejidad cognitiva ≤ 15, máx. 4 parámetros, máx. 3 niveles de anidación, aviso sobre 60 líneas).
3. **Sin dependencias circulares.** Ningún módulo puede depender, directa o indirectamente, de sí mismo. 🤖
4. **Cada capa solo habla con la de abajo.** Nunca se salta una capa ni se llama hacia arriba. 🤖
5. **Patrones cuando resuelven un problema real, no por moda.** Cada vez que se aplica uno, se nombra en el comentario y se explica **por qué** (sección 7).
6. **Explícito antes que ingenioso.** Código fácil de leer para cualquiera de nosotras dentro de seis meses.
7. **Sin código muerto.** Lo que no se usa se borra. 🤖
8. **Todo cambio de lógica viene con sus tests** (sección 9).

---

## 2. Capas

```
  Interfaz (src/app, src/components)
        │  llama a
        ▼
  Controladores   src/server/controllers   ← entrada: Server Actions y Route Handlers
        │  usan
        ▼
  Servicios       src/server/services      ← reglas del negocio y transacciones
        │  usan                 │  usan
        ▼                       ▼
  Repositorios    src/server/repositories   Dominio   src/domain  ← cálculos puros
        │  usan
        ▼
  Base de datos   src/db                   ← esquema, cliente, migraciones, vistas
```

| Capa | Carpeta | Responsabilidad | No puede |
|---|---|---|---|
| **Controlador** | `src/server/controllers` | Recibir la petición, verificar sesión y permisos, validar la entrada (DTO), llamar **un** servicio, devolver un `ActionResult` con un DTO de salida | Tener reglas del negocio; tocar repositorios o la base 🤖 |
| **Servicio** | `src/server/services` | Orquestar un caso de uso (por ejemplo, "registrar venta"): abrir la transacción, aplicar reglas, llamar repositorios y funciones del dominio | Conocer HTTP, formularios o la UI 🤖 |
| **Dominio** | `src/domain` | Cálculos puros: FEFO, costo real, costo promedio, precio mínimo, redondeo, ofertas, utilidad | Importar base de datos, servidor, Next.js o React 🤖 |
| **Repositorio** | `src/server/repositories` | Consultas a la base: CRUD atómico por tabla y consultas específicas | Llamar servicios o controladores; tener reglas del negocio 🤖 |
| **Base de datos** | `src/db` | Esquema Drizzle, cliente, migraciones, vistas y permisos | Ser importada fuera de repositorios 🤖 |

**Archivos de apoyo:** `src/server/dto` (formas de entrada y salida), `src/server/mappers` (conversión fila ↔ DTO), `src/server/errors` (errores tipados) y `src/server/logger` (logs).

Todo archivo de `src/server` y `src/db` empieza con `import "server-only"`. Así, si alguien lo importa desde un componente de cliente, el build falla en vez de exponer código o secretos.

---

## 3. Controladores

En Next.js 16 los controladores son:
- **Server Actions** (`"use server"`): para todas las mutaciones desde formularios y botones del panel. Es el mecanismo recomendado por Next.js.
- **Route Handlers** (`app/api/.../route.ts`): solo cuando hace falta una URL HTTP real (por ejemplo, exportar a Excel o un webhook).

Reglas:
1. **Cada controlador es una entrada pública.** Next.js documenta que una Server Action puede invocarse con un POST directo, sin pasar por la UI. Por eso **cada** controlador verifica la sesión y los permisos por sí mismo, aunque la página ya lo haya hecho.
2. **Validar toda entrada** con un esquema (Zod) antes de pasarla al servicio: `FormData`, parámetros de URL, query y headers son datos no confiables.
3. **Recibir referencias, no objetos completos.** El cliente envía el ID y el cambio; el resto se vuelve a leer de la base. Nunca se confía en precios, costos o stock que vengan del cliente.
4. **Delgados:** validar → llamar **un** servicio → mapear la respuesta. Sin lógica del negocio.
5. **Devolver siempre `ActionResult<T>`** usando `runAction()` (`src/server/controllers/action-result.ts`). Así los errores esperados llegan a la UI como valor, como recomienda Next.js para `useActionState`.
6. **Devolver solo un DTO de salida** con lo que la pantalla necesita. Nunca una fila completa de la base.
7. Después de una mutación, invalidar lo que cambió: `revalidatePath`, `updateTag` o `refresh` (ver *Server Actions* en la documentación de Next.js).

```ts
// src/server/controllers/sales.controller.ts
"use server";

/** Registra una venta desde la pantalla de venta rápida. */
export async function registerSaleAction(input: unknown): Promise<ActionResult<RegisteredSaleDto>> {
  return runAction(logger, "registerSale", async () => {
    const session = await requireAdminSession();              // 1. sesión y permisos
    const data = parseOrThrow(registerSaleSchema, input);     // 2. validación (DTO de entrada)
    const sale = await salesService.register(data, session.userId); // 3. un servicio
    revalidatePath("/ventas");
    return toRegisteredSaleDto(sale);                         // 4. DTO de salida
  });
}
```

---

## 4. Servicios

1. **Un servicio por módulo** (`sales.service.ts`, `purchases.service.ts`, …), con **un método por caso de uso**.
2. **Toda operación que escribe en más de una tabla va dentro de una transacción.** El servicio abre la transacción y se la pasa a los repositorios (patrón *Unit of Work*). Si algo falla, no queda nada a medias.
3. **Los cálculos van en `src/domain`**, no en el servicio. El servicio busca los datos, llama al dominio y guarda el resultado.
4. **Las reglas del negocio se expresan lanzando errores tipados** (`BusinessRuleError`, `NotFoundError`, …) con un mensaje claro en español para la usuaria.
5. **Registrar en el log los eventos importantes** (`info`: "venta #123 registrada") y las reglas que bloquean una operación (`warn`).
6. **Sin dependencias ocultas:** los repositorios y la configuración se reciben por parámetro o se importan explícitamente. Así se pueden reemplazar en los tests.

---

## 5. Repositorios (acceso a datos)

En este proyecto, **repositorio** cumple el rol de **DAO** (*Data Access Object*): es la única capa que sabe cómo se guardan los datos.

1. **Un repositorio por tabla** (`lots.repository.ts`, `sales.repository.ts`, …), con métodos **atómicos**: `findById`, `findMany`, `insert`, `update`, `archive`.
2. **No se implementan operaciones que la tabla no debe tener.** Las tablas de historial y movimientos (`stock_movements`, `money_movements`, `capital_movements`, `price_changes`) **solo permiten insertar**: sus repositorios no tienen `update` ni `delete`. Las anulaciones se hacen insertando el movimiento inverso.
3. **Consultas específicas** (por ejemplo, "lotes con saldo de una variante, ordenados por vencimiento") se agregan como métodos con nombre descriptivo en el repositorio de la tabla principal. Reutilizan las consultas base cuando se puede; si no, se escriben desde cero.
4. **Cada método acepta opcionalmente la transacción en curso** (`tx`), para participar en la transacción del servicio.
5. **Solo con Drizzle o SQL parametrizado.** Nunca se arman consultas concatenando texto con datos (riesgo de inyección SQL).
6. **Seleccionar solo las columnas necesarias.** Nada de `SELECT *` hacia capas superiores.
7. **Errores de base de datos:** se capturan, se registran **una vez** en el log con el contexto (tabla, operación, sin datos sensibles) y se relanzan como `DatabaseError` marcado como registrado. Las violaciones conocidas se traducen al error de negocio que corresponda (por ejemplo, SKU repetido → `ConflictError`).
8. **El acceso a `process.env` y a las credenciales vive solo en `src/db` y `src/server/storage`** (archivos en Cloudflare R2). Es la recomendación de Next.js: solo la capa de acceso a datos lee secretos.

---

## 6. DTO, DAO y mappers

| Concepto | Qué es aquí | Dónde |
|---|---|---|
| **Entidad / fila** | Lo que devuelve la base (todas las columnas de la tabla) | Tipos inferidos del esquema en `src/db` |
| **DAO** | El objeto que accede a la base | Repositorios (`src/server/repositories`) |
| **DTO de entrada** | Lo que la UI envía, validado | Esquemas Zod en `src/server/dto` |
| **DTO de salida** | Lo mínimo que la UI necesita mostrar | Tipos en `src/server/dto` |
| **Mapper** | Función que convierte entidad → DTO de salida | `src/server/mappers` |

Reglas:
1. **Ninguna entidad cruza hacia la UI.** Todo pasa por un mapper que elige los campos. Esto es la defensa principal para que costos, proveedores o capital nunca lleguen a una pantalla que no corresponde. Next.js recomienda este mismo enfoque (*Data Access Layer + DTOs*).
2. **El esquema Zod es la fuente de verdad del DTO de entrada:** el tipo se obtiene con `z.infer`, no se escribe dos veces.
3. **Un DTO por necesidad de pantalla**, no un DTO gigante reutilizado para todo.
4. **Los mappers son funciones puras** y tienen tests.

---

## 7. Patrones de diseño que usamos

Se usan solo donde resuelven un problema concreto. En el código, el comentario del archivo o del método indica el patrón y el motivo.

| Patrón | Dónde | Por qué |
|---|---|---|
| **Arquitectura en capas** | Todo `src/server` | Separar entrada, reglas y datos; cada parte se prueba por separado |
| **Repositorio / DAO** | `src/server/repositories` | Un único lugar que sabe cómo se guardan los datos |
| **DTO** | `src/server/dto` | Mostrar a la UI solo lo necesario y validar lo que entra |
| **Mapper** | `src/server/mappers` | Convertir entidades a DTOs en un solo lugar, probado |
| **Service Layer** | `src/server/services` | Un caso de uso = un método, con su transacción |
| **Unit of Work** (transacción) | Servicios | Que una venta, sus movimientos y sus pagos se guarden juntos o no se guarde nada |
| **Strategy** | `src/domain/pricing` (modos de margen: %, fijo, mayor) | Agregar o cambiar una forma de calcular sin tocar las demás |
| **Result / unión discriminada** | `ActionResult` | Errores esperados como valor para la UI (recomendación de Next.js) |
| **Jerarquía de errores tipados** | `src/server/errors` | Cada error sabe su código y su mensaje para la usuaria |
| **Facade** | `src/server/logger` | Una interfaz única de logs, con formato uniforme |

Antes de agregar un patrón nuevo, se agrega a esta tabla en el mismo PR, con su justificación.

---

## 8. Errores y logs

### Errores
1. **Lanzar excepciones está permitido** cuando la operación no puede continuar, **siempre** con una clase de `src/server/errors` y un **mensaje en español apto para la usuaria**.
2. **Nunca lanzar `Error` genérico ni strings.** Los errores no previstos se envuelven en `UnexpectedError`.
3. **El detalle técnico va en `context` y `cause`** (para el log), **nunca** en el mensaje para la usuaria.
4. **La frontera es el controlador:** `runAction()` convierte cualquier error en un `ActionResult` con código, mensaje y errores por campo.
5. **Errores no esperados durante el render** los muestran los archivos `error.tsx` de Next.js con un mensaje amable.

### Logs
1. **Siempre con el logger** (`createLogger("capa:modulo")`), nunca con `console`. 🤖
2. **Qué registra cada capa:**

| Capa | Nivel | Qué |
|---|---|---|
| Repositorio | `error` | Fallas de la base (operación, tabla, código de error), una sola vez |
| Servicio | `info` / `warn` | Eventos del negocio (venta registrada, precio subido solo) y reglas que bloquean |
| Controlador | `warn` / `error` | Resultado de errores que no se registraron antes (lo hace `runAction`) |

3. **No duplicar:** un error se registra una sola vez. La capa que lo registra lo marca con `logged = true`.
4. **Nunca registrar secretos ni datos sensibles.** El logger oculta claves como `password` o `token`, pero igual no se envían.

---

## 9. Tests

1. **Todo método de servicio, repositorio, mapper y función del dominio tiene tests.**
2. **Ubicación:** carpeta `tests/`, separada del código, replicando la estructura de `src/`:

| Carpeta | Qué | Base |
|---|---|---|
| `tests/unit` | Unitarios por función o método | Ninguna |
| `tests/property` | Secuencias aleatorias (fast-check) | Ninguna o PGlite |
| `tests/integration` | Caminos completos (compra → venta → anulación) | PGlite (memoria) |
| `tests/postgres` | Concurrencia y permisos | Postgres en contenedor |
| `tests/helpers` | Utilidades compartidas | — |

3. **Cada test, en tres partes:** preparar → ejecutar → verificar (*Arrange / Act / Assert*), con nombres que describen el comportamiento en español ("rechaza la venta si no hay stock").
4. **Los tests nunca dependen entre sí** ni del orden. Cada uno arma sus datos.
5. **Nunca contra Neon.**

---

## 10. Base de datos

1. **Cambios solo con migraciones.** Nunca se modifica la base a mano.
2. **Nada se borra:** se archiva (`archived_at`) o se anula (`status = voided` + movimiento inverso).
3. **Dinero:** `numeric(12,2)` en la base; en el código, **centavos enteros** (ver guía de TypeScript).
4. **Reglas críticas también en la base** (CHECK, UNIQUE, claves foráneas, triggers): si el código tiene un error, la base igual lo impide.
5. **Índices** en claves foráneas y columnas de búsqueda frecuente.

---

## 11. Next.js 16: puntos específicos

1. **Cache Components está activado.** Los datos del panel cambian constantemente: **no usar `"use cache"`** en lecturas del panel. Las lecturas se hacen en Server Components dentro de `<Suspense>` con un estado de carga.
2. **APIs de petición asíncronas:** `cookies()`, `headers()`, `params` y `searchParams` se usan con `await`.
3. **`proxy.ts`** reemplaza a `middleware.ts` (para la protección de rutas del panel en la etapa del login).
4. **Sin efectos secundarios durante el render.** Las mutaciones solo en Server Actions.
5. **Ante cualquier duda de API, se consulta `node_modules/next/dist/docs/`** antes de escribir código. La versión instalada manda sobre lo que recordemos de versiones anteriores.

---

## 12. Lista de control antes de abrir un PR

- [ ] Cada función nueva hace una sola cosa y tiene su comentario (qué hace y, si aplica, qué patrón sigue y por qué).
- [ ] El código está en la capa correcta.
- [ ] Toda entrada se valida; todo controlador verifica sesión y permisos.
- [ ] Solo salen DTOs hacia la UI.
- [ ] Los errores son tipados, con mensaje para la usuaria; los logs no tienen datos sensibles.
- [ ] Las escrituras en varias tablas están en una transacción.
- [ ] Hay tests nuevos o actualizados, y pasan.
- [ ] `npm run check` pasa localmente.
