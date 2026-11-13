# Guía de TypeScript

Buenas prácticas de TypeScript para todo el proyecto (servidor, interfaz y tests).
El objetivo: que **el compilador encuentre los errores antes que las usuarias**.

Las reglas marcadas con 🤖 las verifica TypeScript o ESLint en CI.

---

## 1. Configuración estricta

El proyecto usa el modo más estricto razonable (`tsconfig.json`):

| Opción | Qué evita |
|---|---|
| `strict` | Valores `null`/`undefined` no controlados, parámetros sin tipo, etc. |
| `noUncheckedIndexedAccess` | Suponer que `lista[0]` existe sin comprobarlo |
| `noImplicitOverride` | Sobrescribir un método de la clase padre sin darse cuenta |
| `noFallthroughCasesInSwitch` | Olvidar un `break` en un `switch` |
| `useUnknownInCatchVariables` | Tratar el error de un `catch` como si fuera de un tipo conocido |

**Nunca se desactivan estas opciones** para "hacer pasar" un error.

---

## 2. Tipos: reglas básicas

1. **Prohibido `any`.** 🤖 Si el tipo no se conoce, se usa `unknown` y se **verifica** antes de usarlo (con una validación Zod o un `typeof`).
2. **Tipos de retorno explícitos en todo lo exportado.** 🤖 Así un cambio interno no altera sin aviso lo que reciben las demás capas.
3. **Prohibido el `!` de "confío en que no es nulo".** 🤖 Se comprueba con un `if` o se usa `?.` / `??`.
4. **Evitar `as`** (afirmación de tipo). Solo se permite después de validar el dato, y con un comentario que explique por qué es seguro.
5. **`type` para uniones y composiciones; `interface` para la forma de objetos** que se implementan o extienden. Dentro de un archivo se usa siempre el mismo criterio.
6. **Imports de tipos con `type`:** `import { type Venta } from ...`. 🤖

---

## 3. Uniones en vez de `enum`

1. **Valores fijos como unión de literales**, no `enum`:
   ```ts
   type PaymentMethod = "cash" | "qr" | "transfer";
   ```
   Si además hace falta la lista de valores: `const PAYMENT_METHODS = ["cash", "qr", "transfer"] as const;` y `type PaymentMethod = (typeof PAYMENT_METHODS)[number];`.
2. **Uniones discriminadas** para estados con datos distintos. Cada variante tiene un campo que la identifica:
   ```ts
   type ActionResult<T> =
     | { ok: true; data: T }
     | { ok: false; error: { code: AppErrorCode; message: string } };
   ```
3. **`switch` exhaustivos:** al recorrer una unión, todos los casos deben estar cubiertos. 🤖 Si mañana se agrega un medio de pago, el compilador señala cada lugar que hay que actualizar.

---

## 4. Dinero, cantidades y fechas

1. **El dinero nunca se maneja con decimales de JavaScript** (`0.1 + 0.2 !== 0.3`). Se maneja en **centavos enteros** con un tipo propio:
   ```ts
   /** Monto en centavos de boliviano. 289,90 Bs = 28990. */
   type Cents = number & { readonly __brand: "Cents" };
   ```
   Este tipo "con marca" (*branded type*) impide mezclar por error centavos con bolivianos o con una cantidad de unidades.
2. **Conversiones solo en `src/lib/money`:** de la base (`numeric` llega como texto) a centavos, de centavos a texto para mostrar, y los redondeos de la especificación (5 / 9,90 y 0,10).
3. **Cantidades de stock: enteros.** Se validan como enteros positivos al entrar.
4. **IDs con marca** cuando conviene evitar confusiones (`VariantId`, `LotId`), para no pasar el ID de un lote donde se espera el de una variante.
5. **Fechas:** se guardan en UTC. Para mostrarlas se usa la zona horaria de Bolivia (`America/La_Paz`) y siempre con las funciones de `src/lib/dates`.

---

## 5. Inmutabilidad

1. **`const` por defecto;** `let` solo si el valor realmente cambia. 🤖
2. **`readonly`** en propiedades de DTOs, configuraciones y parámetros que no deben modificarse.
3. **No modificar los argumentos recibidos:** se devuelve un objeto nuevo (`{ ...venta, total }`).
4. **Funciones puras en `src/domain`:** misma entrada → misma salida, sin efectos secundarios. Son las más fáciles de probar.

---

## 6. Validación en los bordes

1. **Todo dato que entra al sistema se valida con Zod** (formularios, parámetros de URL, archivos importados, variables de entorno).
2. **El esquema es la fuente de verdad del tipo:**
   ```ts
   const registerSaleSchema = z.object({ variantId: z.uuid(), quantity: z.number().int().positive() });
   type RegisterSaleDto = z.infer<typeof registerSaleSchema>;
   ```
3. **Después de validar, el resto del código confía en el tipo** y no repite comprobaciones.
4. **Tipos utilitarios** (`Pick`, `Omit`, `Partial`, `Readonly`) para derivar DTOs a partir de otros tipos, en vez de copiarlos a mano.

---

## 7. Funciones y asincronía

1. **Funciones cortas, de una sola responsabilidad** (ver guía de backend). 🤖
2. **Como máximo 4 parámetros;** si hacen falta más, se recibe un objeto con nombre. 🤖
3. **`async`/`await`**, no cadenas de `.then()`.
4. **Toda promesa se espera o se maneja.** 🤖 Una promesa "suelta" puede fallar sin que nadie se entere.
5. **`catch (error: unknown)`:** el error se convierte con `toAppError()` antes de usarlo.
6. **Genéricos** cuando una función sirve para varios tipos (por ejemplo, `runAction<T>`), con nombres claros (`T`, `TDto`).

---

## 8. Nombres y comentarios

**Idioma:** el **código en inglés** (nombres de archivos, variables, funciones, tipos, tablas y columnas); **los textos que ven las usuarias, los comentarios y la documentación en español**. Así el código es coherente con las librerías y con el esquema de la base, y todo lo que se lee como explicación queda en español. El glosario de la sección 8.1 conecta ambos idiomas.

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivos | kebab-case | `minimum-price.ts`, `sales.service.ts` |
| Componentes y tipos | PascalCase | `ConfirmDialog`, `RegisteredSaleDto` |
| Funciones y variables | camelCase, verbo para funciones | `calculateMinimumPrice`, `availableStock` |
| Constantes globales | UPPER_SNAKE_CASE | `DEFAULT_MARGIN_PCT` |
| Booleanos | `is`, `has`, `can` | `isOffer`, `hasStock` |

1. **Cada función o componente exportado tiene un comentario JSDoc** (`/** ... */`) en español, que explica qué hace y, si aplica, qué patrón sigue y por qué.
2. **Los comentarios explican el porqué, no el qué.** El código ya dice qué hace.
3. **Sin `export default`**, salvo en los archivos que Next.js exige (`page.tsx`, `layout.tsx`, etc.). Los nombres explícitos facilitan buscar y refactorizar.

### 8.1 Glosario

| Español | Código |
|---|---|
| producto / variante | `product` / `variant` |
| tono / presentación | `shade` / `presentation` |
| lote / vencimiento | `lot` / `expiresOn` |
| compra / proveedor | `purchase` / `supplier` |
| venta / ítem de venta | `sale` / `saleItem` |
| movimiento de stock | `stockMovement` |
| costo real / costo promedio | `landedUnitCost` / `averageCost` |
| precio mínimo / oferta | `minimumPrice` / `offer` |
| cuadre | `inventoryCount` |
| caja / banco / cuenta | `cash` / `bank` / `moneyAccount` |
| socia / aporte / retiro | `partner` / `contribution` / `withdrawal` |
| reparto de ganancias | `profitDistribution` |
| gasto / gasto recurrente | `expense` / `recurringExpense` |
| centavos | `Cents` |

---

## 9. Lista de control antes de abrir un PR

- [ ] Sin `any`, sin `!`, y `as` solo con justificación.
- [ ] Todo lo exportado tiene tipo de retorno y comentario JSDoc.
- [ ] El dinero está en `Cents`; nada de decimales sueltos.
- [ ] Las entradas se validan con Zod y el tipo sale del esquema.
- [ ] Las uniones se recorren con `switch` exhaustivo.
- [ ] Ninguna promesa queda sin esperar.
- [ ] `npm run check` pasa localmente.
