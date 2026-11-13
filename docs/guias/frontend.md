# Guía de frontend

Reglas para las pantallas del panel: React 19, Next.js 16 (App Router) y Material UI.
Basada en la documentación oficial de Next.js 16 (*Server and Client Components*, *Forms*, *Error Handling*, *Caching*) y en las reglas de React.

Las reglas marcadas con 🤖 las verifica la máquina en CI.

---

## 1. Principios

1. **Reutilizar antes que crear.** Antes de escribir un componente, se busca en `src/components` uno que sirva o que pueda extenderse.
2. **Componer antes que configurar.** Se arman pantallas juntando piezas chicas (`children`, *slots*), no con un componente gigante lleno de opciones.
3. **Los componentes muestran; no deciden reglas del negocio.** Los cálculos de precios, stock o dinero viven en el servidor.
4. **Celular primero.** Todo se diseña primero para la pantalla del teléfono y después se amplía.
5. **Comentarios que expliquen el porqué**, incluido el patrón usado (sección 7).

---

## 2. Componentes de servidor y de cliente

| | Server Component (por defecto) | Client Component (`"use client"`) |
|---|---|---|
| Para | Leer datos, armar la página | Interactividad: estado, eventos, efectos |
| Puede | Llamar controladores de lectura, usar `await` | `useState`, `onClick`, `useActionState` |
| No puede | Tener estado ni eventos | Importar código del servidor o de la base 🤖 |

Reglas:
1. **`"use client"` lo más abajo posible.** Solo en el componente que necesita interactividad, no en la página entera. Así se envía menos JavaScript al teléfono.
2. **Los componentes de MUI necesitan estar en un componente de cliente.** Se envuelven en nuestros propios componentes de `src/components/ui` (sección 3), que ya traen la directiva.
3. **Las props de un Client Component reciben solo lo que muestran** (un DTO pequeño), nunca objetos completos. Todo lo que se pasa a un componente de cliente llega al navegador.
4. **Las lecturas de datos van en Server Components**, dentro de `<Suspense>` con un estado de carga (Cache Components está activado).

---

## 3. Reutilización de componentes

### Organización

```
src/components/
  ui/          Piezas genéricas sobre MUI, sin conocimiento del negocio
               Button, TextField, Select, DataTable, Dialog, ConfirmDialog,
               PageHeader, EmptyState, StatusChip, MoneyText, DateText, Toast
  forms/       Piezas de formulario: FormField, FormActions, FieldError, MoneyField
  layout/      Estructura del panel: AppShell, Sidebar, BottomNav (celular), Section
  <modulo>/    Componentes de un módulo que se reutilizan en varias pantallas de ese módulo
               ej. productos/VariantCard, ventas/SaleItemRow
src/app/(panel)/<modulo>/
  page.tsx     La página solo arma piezas y pide datos
```

### Reglas
1. **Las páginas no tienen estilos ni lógica propia:** solo componen componentes.
2. **Los componentes de `ui/` no conocen el negocio** (no saben qué es una venta). Reciben datos y eventos por props.
3. **Nunca se usa un componente de MUI directo en una página.** Se usa el envoltorio de `ui/`. Así, si mañana cambia el estilo de los botones, se cambia en un solo lugar.
4. **Regla de dos:** si algo se repite en dos pantallas, se extrae a un componente. Antes de eso, no se generaliza "por si acaso".
5. **Un componente, un archivo**, con nombre en PascalCase y archivo en kebab-case (`confirm-dialog.tsx` exporta `ConfirmDialog`).
6. **Props tipadas y mínimas**, con valores por defecto razonables. Si un componente pasa de ~6 props, probablemente conviene dividirlo o usar composición.
7. **Formateo de dinero y fechas siempre con `MoneyText` / `DateText`** (o las funciones de `src/lib`), para que se vea igual en todo el panel.

---

## 4. Formularios y mutaciones

1. **Formularios con Server Actions y `useActionState`**, como recomienda Next.js 16.
2. La acción devuelve un `ActionResult`. El formulario muestra:
   - `error.message` en un aviso general;
   - `error.fieldErrors` debajo de cada campo.
3. **Mientras se envía, el botón se deshabilita** (`pending`) para evitar ventas duplicadas.
4. **La validación del navegador es solo una ayuda;** la validación real ocurre en el servidor.
5. **Acciones destructivas** (anular venta, anular compra) siempre con `ConfirmDialog`.

---

## 5. Estado y efectos

1. **El estado vive lo más cerca posible de donde se usa.** Sin estado global salvo que realmente se comparta (por ejemplo, el carrito de la venta rápida).
2. **Evitar `useEffect`.** No se usa para calcular datos derivados ni para leer datos: los derivados se calculan durante el render y los datos se leen en Server Components.
3. **React Compiler está activado:** no se agregan `useMemo`, `useCallback` ni `memo` manualmente salvo que una medición demuestre que hace falta.
4. **Reglas de los hooks:** solo en el nivel superior del componente, nunca dentro de condiciones o bucles. 🤖
5. **`key` estable en las listas** (el ID, nunca el índice). 🤖

---

## 6. Errores, carga y estados vacíos

1. Cada sección del panel tiene **`loading.tsx`** (o `<Suspense>`) y **`error.tsx`** con un mensaje amable y un botón "Reintentar".
2. **Las listas vacías muestran `EmptyState`** con una acción sugerida ("Registra tu primera compra").
3. **Nunca se muestra un error técnico a la usuaria.** Solo el `message` del `ActionResult`.

---

## 7. Patrones de diseño que usamos

| Patrón | Dónde | Por qué |
|---|---|---|
| **Composición** (`children`, slots) | Todo `src/components` | Armar pantallas con piezas chicas sin componentes llenos de opciones |
| **Envoltorio (Adapter) sobre MUI** | `src/components/ui` | Un solo lugar para el estilo y el comportamiento de cada pieza |
| **Contenedor / Presentación** | Página (servidor, pide datos) → componente (muestra) | Separar quién trae los datos de quién los dibuja |
| **Componentes compuestos** | Por ejemplo `DataTable` + `DataTable.Column` | Componentes flexibles sin decenas de props |
| **Custom hooks** | `src/components/**/use-*.ts` | Reutilizar lógica de interfaz (por ejemplo, el carrito de venta) |

Al usar uno de estos patrones, el comentario del componente lo indica y explica el motivo.

---

## 8. Material UI y estilo

1. **Un solo tema** (`src/components/theme`): colores, tipografía, espaciados y bordes. **No se escriben colores ni tamaños sueltos** en los componentes.
2. **Responsive con los *breakpoints* de MUI.** En el celular: navegación inferior, botones grandes y formularios en una columna.
3. **Accesibilidad:** cada campo con su `label`, botones con texto o `aria-label`, contraste suficiente y navegación con teclado. 🤖 (reglas de accesibilidad de Next.js).
4. **Íconos y textos en español**, con un tono claro y amable.

---

## 9. Tests de interfaz

1. Los componentes de `ui/` con lógica (por ejemplo `MoneyText`) tienen tests unitarios con Testing Library.
2. Los flujos clave (venta rápida, registrar compra) tendrán tests de punta a punta con un navegador automatizado (Playwright) en una etapa posterior.

---

## 10. Lista de control antes de abrir un PR

- [ ] Reutilicé componentes existentes; lo nuevo y reutilizable está en `src/components`.
- [ ] `"use client"` solo donde hace falta.
- [ ] Ningún componente de cliente recibe datos que no muestra.
- [ ] La pantalla funciona y se ve bien en el celular.
- [ ] Hay estados de carga, error y vacío.
- [ ] Sin colores ni tamaños sueltos: todo sale del tema.
- [ ] Los comentarios explican el patrón usado y el porqué.
