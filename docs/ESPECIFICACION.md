# Soleil — Sistema de gestión (panel privado)

Especificación del sistema.
Versión 3 — **aprobada**. Incorpora todas las decisiones de la revisión (ver sección 11).

---

## 1. Objetivo y alcance

Sistema privado para administrar la tienda de dermocosmética **Soleil** (Cochabamba): productos, proveedores, compras, ventas, stock, precios, ofertas por vencimiento, dinero (caja y banco), capital de las socias, gastos y reportes. Reemplaza las planillas actuales ("cuadres", pedidos, ventas semanales).

- Usuarias: 2 administradoras (Vanessa y Ericka), desde celular y computadora.
- Volumen: ~100–170 variantes de producto.
- **Fuera de alcance de este repositorio:** la página pública (va en otro repositorio y solo lee vistas públicas).
- **Para más adelante:** descuentos manuales y ventas por mayor, combos/promociones armadas, notificaciones a clientas, agente de WhatsApp, facturación electrónica.

**Cómo se trabaja hoy (según el Excel) y qué cambia:**

| Hoy | Con el sistema |
|---|---|
| Las ventas se deducen comparando conteos ("había 11, ahora hay 7 → se vendieron 4") | Cada venta se registra en el momento, con precio real, canal y medio de pago |
| El stock se escribe a mano en cada cuadre | El stock se calcula solo a partir de compras, ventas y ajustes |
| El costo es "180-200-181" en una celda | Cada compra guarda su costo por lote |
| Los nombres varían entre hojas | Un solo catálogo con código único por variante |
| La utilidad es aproximada | La utilidad usa el costo real de cada unidad vendida |
| "PAGO VANE", "INVERSIÓN VANE" en notas sueltas | Aportes, retiros y repartos de ganancias registrados por socia |
| El cuadre es el único control | Se mantiene el **cuadre** (conteo físico) como pantalla, y las diferencias se registran como ajustes |

---

## 2. Arquitectura

| Tema | Decisión |
|---|---|
| Repositorios | **`SkinCareStore`** = panel privado y **dueño del esquema de la base de datos**. La página pública irá en otro repositorio y solo leerá vistas `public_*` |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Interfaz | Material UI (MUI), responsive, pensada para celular primero |
| Base de datos | Postgres en Neon (proyecto nuevo, separado de Xiaomi), con Drizzle ORM |
| Archivos | Cloudflare R2: bucket **público** para fotos y bucket **privado** para facturas de compra (enlaces temporales) |
| Login | Google (Auth.js), solo los emails autorizados |
| Hosting | Vercel (proyecto nuevo) |
| Dominio | `.com` comprado en Cloudflare, con "bolivia" en el nombre (por ejemplo `soleilbolivia.com`; disponibilidad a confirmar) |
| Tests | Vitest (unitarios, integración, secuencias aleatorias con fast-check) sobre PGlite y Postgres en contenedor (ver sección 7) |
| CI | GitHub Actions en cada pull request; `main` protegida: no se mergea nada con tests en rojo |

**Estructura del repositorio:**

```
src/
  app/        pantallas y rutas (Next.js)
  domain/     lógica de negocio pura, sin base de datos, con sus tests
              fefo.ts        qué lote se descuenta primero
              costing.ts     costo real por lote y costo promedio
              pricing.ts     precio mínimo, redondeo y precio de oferta
              profit.ts      utilidad, resultado mensual y repartos
              money.ts       pagos, cuentas y cierre de caja
  server/     operaciones con la base de datos (transacciones)
  db/         esquema, migraciones, vistas públicas y permisos
docs/         especificación y decisiones
```

**Dinero:** en la base `numeric(12,2)`; en el código se maneja en **centavos enteros** para evitar errores de redondeo.

---

## 3. Modelo de datos

🔒 = privado (nunca llega a la página pública).

### 3.1 Configuración

**settings** (una sola fila, editable desde el panel)
- Datos de la tienda: nombre, teléfonos, direcciones, redes
- `default_margin_pct` = 25
- `default_min_stock` = 2
- `expiry_tiers` — escalones de vencimiento (ver 4.8). Por defecto:

| Meses para vencer | Alerta | Descuento sobre la ganancia |
|---|---|---|
| 6 | Empezar a moverlo | 10% |
| 3 | Promoción | 25% |
| 2 | Urgente | 50% |

### 3.2 Catálogo

**brands** — `id, name (único), slug, logo_url, archived_at`

**categories** — `id, name (único), slug, parent_id, archived_at`

**products** (lo común a todas sus variantes)
- `id, name, slug, brand_id, category_id, description, usage_instructions`
- `skin_types text[]` (grasa, seca, mixta, sensible, con acné, con manchas, madura, todo tipo)
- `published, featured, archived_at, created_at, updated_at`

**product_variants** (lo que se vende y se cuenta)
- `id, product_id, sku (único), barcode`
- `shade` (tono) y `presentation` (tamaño), ambos opcionales
- `sale_price_bs` — precio de venta normal
- `min_stock` — vacío = usa el de la tienda
- `margin_mode` (`pct` | `fixed` | `max`), `margin_pct`, `margin_fixed_bs` — vacíos = usa el de la tienda
- `price_auto_raised_at` — aviso pendiente cuando el sistema subió el precio solo
- `published, archived_at`

**product_images** — `id, product_id, variant_id (opcional), url, alt, order`

**price_changes** 🔒 — historial: `variant_id, old_price, new_price, reason (manual | auto_cost), created_by, created_at`

### 3.3 Compras e inventario 🔒

**admin_users** — `id, email, name, active`

**suppliers** — `id, name, city, contact_name, phone, notes, active`

**purchases**
- `id, supplier_id, purchase_date, invoice_number, invoice_file_key` (R2 privado)
- `shipping_cost_bs`
- `status` (registered | voided), `notes, created_by, created_at`

**lots** (cada línea de compra es un lote)
- `id, purchase_id, variant_id`
- `quantity` (unidades pagadas), `free_quantity` (regalo del **mismo** producto, por ejemplo 10+1)
- `is_gift` — línea completa de regalo de **otro** producto (costo 0)
- `unit_price_bs` (precio pagado por unidad; 0 si `is_gift`)
- `landed_unit_cost_bs` — costo real por unidad (ver 4.2)
- `lot_code, expires_on`

**purchase_payments** — cómo se pagó la compra (una o varias líneas)
- `purchase_id, source` (`account` | `partner`), `account_id` o `partner_id`, `amount_bs`

**stock_movements**
- `id, variant_id, lot_id, quantity` (con signo)
- `type`: initial | purchase | purchase_void | sale | sale_void | adjustment | expired | damaged | sample | supplier_return | count
- `purchase_id, sale_item_id, count_id, reason, created_by, created_at`

**inventory_counts** (cuadre) — `id, counted_at, status (open | closed), notes, created_by`
**inventory_count_lines** — `count_id, variant_id, expected_qty, counted_qty`

### 3.4 Ventas 🔒

**sales**
- `id, sale_number (correlativo), sold_at`
- `channel`: tienda | whatsapp | instagram | facebook | tiktok | otro
- `customer_name, customer_phone` (opcionales)
- `total_bs, status (completed | voided), void_reason, created_by`

**sale_items**
- `id, sale_id, variant_id, lot_id, quantity`
- `list_price_bs` (precio normal en ese momento)
- `unit_price_bs` (cobrado: normal u oferta)
- `is_offer` — si se vendió con precio de oferta
- `unit_cost_bs` (costo real del lote)

Si una venta toma unidades de dos lotes, se guarda una línea por lote. Así la utilidad y la oferta quedan exactas.

**sale_payments** — una venta puede pagarse con varios medios
- `sale_id, method` (efectivo | qr | transferencia), `amount_bs`, `account_id`

### 3.5 Dinero 🔒

**money_accounts** — por ahora: **Caja** (efectivo) y **Banco** (una cuenta: QR y transferencias)

**money_movements** — todo ingreso y egreso de dinero
- `id, account_id, amount_bs` (con signo)
- `type`: sale | sale_void | purchase | purchase_void | transfer | capital_in | capital_out | profit_out | expense | expense_void | cash_adjustment
- referencias: `sale_id, purchase_id, expense_id, capital_movement_id, transfer_id`
- `note, created_by, created_at`

**cash_closings** (opcional) — `closed_at, expected_bs, counted_bs, difference_bs, note, created_by`

### 3.6 Capital y ganancias 🔒

**partners** — `id, name, active, share_pct_override` (porcentaje manual opcional)
Socias iniciales: **Vanessa** y **Ericka**.

**capital_movements**
- `id, partner_id, type` (contribution | capital_withdrawal | profit_withdrawal)
- `amount_bs, moved_at, account_id` (vacío si la socia pagó una compra directamente)
- `purchase_id` (si el aporte fue pagando una compra), `distribution_id` (si es retiro de ganancias)
- `note, created_by, status (active | voided)`

**profit_distributions** (repartos)
- `id, period_from, period_to, net_profit_available_bs, distributed_bs, reinvested_bs, created_by, created_at`

**profit_distribution_lines** — `distribution_id, partner_id, share_pct, amount_bs`

### 3.7 Gastos 🔒

**expense_categories** — por ahora: Alquiler. Se pueden crear más.

**recurring_expenses** — plantillas mensuales
- `name, category_id, amount_bs, day_of_month, description, active`
- Ejemplo: "Alquiler", 400 Bs, "Alquiler de dos armarios"

**expenses** — `id, category_id, recurring_expense_id, spent_on, amount_bs, account_id, description, created_by, status`

### 3.8 Vistas

| Vista | Uso |
|---|---|
| `v_lot_stock` 🔒 | Saldo por lote, vencimiento, escalón de vencimiento |
| `v_variant_stock` 🔒 | Stock, costo promedio, precio mínimo, estado de alerta |
| `v_account_balance` 🔒 | Saldo de Caja y Banco |
| `v_partner_capital` 🔒 | Capital, porcentaje y ganancias por socia |
| `public_catalog` | Para la página pública (ver sección 6) |
| `public_brands`, `public_categories`, `public_settings` | Datos públicos |

La página pública y el futuro agente de WhatsApp usan un usuario de base de datos que **solo puede leer las vistas `public_*`**.

**Cómo funcionan:** una vista es una **consulta SQL guardada con nombre**. Se consulta como una tabla, pero **no guarda datos**: se calcula en el momento de cada consulta, sobre los datos actuales de las tablas. Por eso siempre está actualizada, sin procesos de recálculo. No se usan vistas materializadas (las que guardan resultados y hay que refrescar). Las vistas privadas evitan repetir cálculos en el panel; las públicas son la ventana controlada que alimenta la página pública.

---

## 4. Reglas de negocio

### 4.1 Stock
- Stock = suma de `stock_movements`. Nunca se edita a mano.
- **No se puede vender sin stock** (bloqueo en la base, con bloqueo de lotes dentro de la transacción para que dos ventas simultáneas no tomen la misma unidad).
- Al vender se descuenta primero el lote que **vence antes** (FEFO). En la tienda se entrega físicamente esa unidad.
- Ventas, compras, gastos y movimientos de capital **no se borran: se anulan**, generando los movimientos inversos.
- Una compra solo se puede anular si ninguna de sus unidades se vendió.

### 4.2 Costo real por unidad (por lote)
```
costo real = (cantidad pagada × precio unitario + parte del envío)
             / (cantidad pagada + unidades de regalo del mismo producto)
```
- **Envío:** se reparte **por igual entre todas las unidades** de la compra (pagadas y de regalo).
- Ejemplo: 10 Active Unify a 220 + 1 de regalo, y otros 9 productos en la misma compra; envío 20 Bs → 1 Bs por unidad → (2.200 + 11) / 11 = **201 Bs**.

### 4.3 Regalos de otro producto
- La línea se marca `is_gift`: costo real **0**.
- **Utilidad:** al venderse, la ganancia es el precio completo.
- **Precio mínimo:** los lotes de regalo **no cuentan** para el costo promedio.
- Si solo quedan unidades de regalo, se usa el costo real de la **última compra pagada** de esa variante. Si nunca hubo compra pagada, el precio se pone a mano.

### 4.4 Costo promedio (solo para el precio mínimo)
```
costo promedio = Σ(saldo del lote × costo real) / Σ(saldo del lote)
                 (solo lotes pagados con saldo > 0)
```
Sin stock pagado: costo real de la última compra pagada.

### 4.5 Precio mínimo y redondeo
```
modo %     → costo promedio × (1 + margen%)
modo fijo  → costo promedio + ganancia fija Bs
modo mayor → el más alto de los dos
precio mínimo = redondeo(resultado)
```

**Redondeo:** se elige el **primer** valor que no sea menor al calculado, en este orden dentro de cada decena: el número redondo (**solo si el cálculo es exacto**), el que termina en **5**, el que termina en **9,90**.

| Calculado | Precio |
|---|---|
| 250,00 (exacto) | 250 |
| 250,01 a 255,00 | 255 |
| 255,01 a 259,90 | 259,90 |
| 259,91 a 265,00 | 265 |

**Precisión:** el costo promedio y el precio mínimo se calculan de forma exacta, aunque den fracciones de centavo (por ejemplo 201,3636… Bs), y se redondean **una sola vez, al final**. Así un precio nunca queda un centavo por debajo del mínimo real.

Se aplica a los precios que **calcula** el sistema. Un precio puesto a mano puede ser cualquiera, siempre que no sea menor al mínimo.

### 4.6 Precio de venta normal
- El panel **no permite** guardar un precio menor al mínimo (validación en pantalla **y** en la base).
- El mínimo se recalcula con cada compra, venta, ajuste o anulación.
- Si el precio queda por debajo del nuevo mínimo, el sistema lo **sube al mínimo**, lo registra en `price_changes` y deja un aviso en la variante hasta que una admin lo revise.
- Los precios **nunca bajan solos**. Si el costo baja, el panel solo sugiere.

### 4.7 Precio cobrado en una venta
- Por defecto se cobra el precio normal o, si corresponde, el de oferta (4.8).
- **Regla fija:** el precio cobrado **nunca** puede ser menor al **costo real** del lote vendido.
- Descuentos manuales y ventas por mayor: **pendiente de diseño** (sección 10). Por ahora no se habilitan.

### 4.8 Vencimientos y ofertas automáticas
- **Alertas** por lote según `expiry_tiers`: 6 meses (empezar a moverlo), 3 meses (promoción), 2 meses (urgente).
- **Oferta automática:** se aplica **solo a las unidades del lote que entra en el escalón**. El lote nuevo, con más vencimiento, **no entra**.
```
ganancia del lote = precio normal − costo real del lote
precio de oferta  = costo real del lote + ganancia × (1 − descuento del escalón)
```
  Ejemplo (precio 290, costo 230, ganancia 60):

| Escalón | Descuento sobre la ganancia | Precio de oferta |
|---|---|---|
| 6 meses | 10% → 6 Bs | 284,00 |
| 3 meses | 25% → 15 Bs | 275,00 |
| 2 meses | 50% → 30 Bs | 260,00 |

- **Redondeo a 0,10 hacia abajo:** no se aplica la regla 5 / 9,90; se muestra el valor calculado con decimales, para que el descuento se note, redondeado a 0,10 hacia abajo para facilitar el cobro en efectivo (por ejemplo 283,47 → 283,40). Si al redondear quedara por debajo del costo real, se redondea hacia arriba.
- **Nunca por debajo del costo real.** Es la única excepción al margen mínimo de 25%.
- La oferta **termina sola** en cualquiera de estos dos casos:
  1. se vendieron todas las unidades de ese lote, o
  2. el lote **llegó a su fecha de vencimiento** sin venderse.

  En la web aparece con el precio normal tachado, en la sección **Ofertas**, con la leyenda **"Hasta agotar stock"**.
- Los porcentajes y los meses se editan en Configuración.
- **Unidades vencidas:** desde su fecha de vencimiento **no se pueden vender** (el sistema las salta al vender y deja de contarlas como disponibles en la web). El panel avisa para darlas de baja: se registran como movimiento `expired`, salen del stock y su costo cuenta como **pérdida**.
- **El vencimiento nunca se muestra en la página pública**, solo en el panel.

### 4.9 Pago de ventas
- Una venta puede pagarse con **varios medios** (por ejemplo, parte en efectivo y parte por QR).
- La suma de los pagos tiene que ser igual al total.
- **Efectivo → Caja. QR y transferencia → Banco.** No se aceptan tarjetas.

### 4.10 Pago de compras
Sección **"¿Con qué dinero se pagó?"**, con una o varias líneas:

| Origen | Efecto |
|---|---|
| Dinero de la tienda (reinversión) | Egreso de **Banco** (o Caja) |
| Una socia, con su dinero | **Aporte de capital** automático a su nombre, vinculado a la compra |

- Admite varias socias y pagos mixtos (por ejemplo, Banco 1.500 + Vanessa 500).
- La suma tiene que ser igual al total de la compra, envío incluido.
- Si se anula la compra, se anulan sus pagos y los aportes que generó.

### 4.11 Dinero (Caja y Banco)
- El saldo de cada cuenta = suma de sus movimientos. Nunca se edita a mano.
- **Depósito:** traspaso de Caja a Banco (dos movimientos enlazados).
- **Cierre de caja (opcional, solo efectivo):**
  1. El panel muestra el **resumen del día**: ventas totales, cuánto entró en efectivo y cuánto por QR o transferencia.
  2. Muestra el **efectivo esperado**: lo que había + ventas en efectivo − salidas de caja (depósitos, gastos en efectivo).
  3. Ustedes cuentan el efectivo y escriben el monto.
  4. Si no coincide, la diferencia queda registrada con un motivo.
  - El **banco** no se cierra a diario en el sistema: el resumen del día indica cuánto entró por QR o transferencia, y se compara con la app del banco.
  - Si un día no se hace el cierre, el sistema sigue funcionando. No hay fondo de cambio obligatorio.

### 4.12 Capital de las socias
- **Capital de cada socia** = aportes − retiros de capital.
- **Porcentaje de cada socia** = su capital / capital total. Se puede **fijar a mano** (`share_pct_override`), y entonces los porcentajes tienen que sumar 100%.
- Un retiro sale de Caja o Banco y genera el movimiento de dinero correspondiente.

### 4.13 Resultado mensual y reparto de ganancias
**Resultado del mes:**
```
ventas
− costo de lo vendido (costo real de cada unidad)
= ganancia bruta
− gastos operativos (alquiler, etc.)
− pérdidas (vencidos, dañados, muestras y ajustes negativos, a costo real)
= ganancia neta del mes
```

- **Ganancia acumulada sin repartir** = suma de las ganancias netas − lo ya repartido. Lo que no se reparte **se queda como reinversión** y sigue sumando mes a mes.
- **Reparto** (cuando ustedes decidan; normalmente cada 3 meses o más): se elige cuánto repartir de lo acumulado. El sistema lo divide **según el porcentaje de cada socia** en ese momento y lo deja registrado.
- **Retiro de ganancias:** cada socia puede retirar hasta lo que le tocó en los repartos menos lo que ya retiró. **No se puede retirar más.**

### 4.14 Gastos
- Cada gasto se registra con su categoría, cuenta de origen y descripción.
- **Gastos recurrentes:** se define una plantilla (por ejemplo, "Alquiler de dos armarios, 400 Bs, día 1"). Cada mes, ese día, el panel muestra el aviso *"Alquiler de noviembre, 400 Bs. ¿Ya se pagó?"*. Cuando se paga, se toca **Confirmar**, se elige si salió de Caja o del Banco y, si cambió, se corrige el monto. Recién ahí queda registrado. No se registra solo porque puede pagarse otro día, desde otra cuenta o por otro monto; el aviso sirve para que no se olvide.

### 4.15 Alertas del panel
- Stock bajo (stock ≤ stock mínimo).
- Lotes por vencer, por escalón.
- Precio subido automáticamente, pendiente de revisar.
- Gasto recurrente pendiente de confirmar.
- Diferencia en el cierre de caja.

---

## 5. Pantallas del panel

1. **Login** con Google.
2. **Inicio:** ventas de hoy y del mes, ganancia del mes, saldos de Caja y Banco, alertas, botón grande "Nueva venta".
3. **Venta rápida** (celular primero): buscar por nombre, código o tono; cantidad; precio normal u oferta aplicado solo; canal; **uno o varios medios de pago**.
4. **Ventas:** lista con filtros, detalle, anular con motivo.
5. **Productos:** lista con búsqueda y filtros; ficha con datos comunes, fotos y **variantes** (tono, tamaño, precio, stock mínimo, margen). Por variante: stock por lote, vencimientos, costo promedio, precio mínimo, historial de precios y de movimientos.
6. **Marcas y categorías.**
7. **Proveedores:** lista, ficha, historial de compras.
8. **Compras:** nueva compra con proveedor, fecha, factura, envío, líneas (variante, cantidad, regalo del mismo producto, línea de regalo de otro producto, precio, lote, vencimiento) y **"¿Con qué dinero se pagó?"**.
9. **Inventario:** stock actual, ajustes con motivo y **cuadre**.
10. **Por vencer y ofertas:** lotes por escalón, unidades, dinero en riesgo y ofertas activas.
11. **Precios:** variantes con precio subido automáticamente.
12. **Dinero:** saldos, movimientos, depósitos Caja → Banco, cierre de caja.
13. **Capital:** socias, capital, porcentajes, aportes, retiros, repartos.
14. **Gastos:** registro, categorías, gastos recurrentes y pendientes.
15. **Reportes:** resultado mensual (ventas, ganancia bruta, gastos, pérdidas, ganancia neta, acumulado sin repartir); ventas por canal y por medio de pago; utilidad por producto; más vendidos. Exportar a Excel.
16. **Importar Excel:** vista previa con errores → productos, variantes y compra "Inventario inicial".
17. **Configuración:** datos de la tienda, margen, stock mínimo, escalones de vencimiento, cuentas.

---

## 6. Contrato con la página pública (otro repositorio)

- Solo lee las vistas `public_*` con un usuario de base de datos limitado.
- **Muestra:** nombre, marca, categoría, descripción, modo de uso, tipos de piel, presentación, tono, precio normal, **precio de oferta** (si hay unidades en oferta), fotos y **disponibilidad**:
  - **Disponible**
  - **Últimas unidades** (stock ≤ stock mínimo)
  - **Agotado**
- **No muestra:** cantidad exacta de stock, vencimientos, lotes, costos, proveedores, compras, ventas, márgenes, dinero, capital ni gastos.
- Los precios ya llegan validados (normal ≥ mínimo; oferta ≥ costo real).

---

## 7. Calidad, tests y entornos

### 7.1 Niveles de tests (todos con Vitest, en el servidor)

| Nivel | Qué prueba | Base de datos |
|---|---|---|
| **Unitarios** | Cada función de `src/domain` por separado, con su resultado esperado (por ejemplo, precio de oferta 290 / 230 / 10% → 284,00) | Ninguna |
| **Integración (camino completo)** | Flujos enteros: compra → venta de dos lotes → anulación → stock, costo, utilidad, saldos y aportes esperados | PGlite |
| **Secuencias aleatorias** | Miles de combinaciones de compras, ventas, anulaciones, ajustes, gastos y movimientos de capital | PGlite |
| **Concurrencia y permisos** | Dos ventas simultáneas de la última unidad; el usuario de la web solo puede leer `public_*` | Postgres en contenedor |
| **Pantallas** (más adelante) | Flujos clave del panel, como la venta rápida, con un navegador automatizado | PGlite o contenedor |

**Reglas que las secuencias aleatorias verifican siempre:**
- el stock nunca es negativo, y la suma de saldos por lote = stock de la variante;
- el precio normal nunca es menor al mínimo;
- ningún precio cobrado ni de oferta es menor al costo real del lote;
- no se venden unidades vencidas;
- los pagos de cada venta y de cada compra suman su total;
- el saldo de cada cuenta = suma de sus movimientos;
- lo repartido nunca supera la ganancia acumulada, y lo retirado por cada socia nunca supera lo que le tocó;
- ganancia neta = ventas − costo de lo vendido − gastos − pérdidas.

### 7.2 Bases de datos para tests

Ningún test toca Neon. Las dos opciones usan el mismo motor Postgres, empiezan vacías y se descartan al terminar:

| | **PGlite** | **Postgres en contenedor** |
|---|---|---|
| Qué es | Postgres en memoria, dentro del proceso de los tests | Servidor Postgres completo, de la misma versión que Neon |
| Dónde corre | En cualquier lado (computadora, sesión, GitHub) | En GitHub Actions |
| Arranque | ~1 segundo | ~10–20 segundos |
| Conexiones simultáneas y bloqueos | No | Sí |
| Permisos entre usuarios | Limitado | Igual que en Neon |
| Uso | ~95% de los tests | Concurrencia y permisos |

### 7.3 Entornos

| Entorno | Base de datos | Uso |
|---|---|---|
| Tests | PGlite / contenedor temporal | Tests automáticos; se crean y destruyen en cada ejecución |
| Desarrollo | Rama de desarrollo de Neon (copia aislada) | Probar el panel mientras se programa |
| Producción | Rama principal de Neon | El sistema real |

Las credenciales de producción nunca están disponibles en los tests ni en GitHub Actions.

### 7.4 Flujo de trabajo con pull requests

1. Cada cambio se hace en una **rama** y se propone con un **pull request (PR)**.
2. **GitHub Actions** corre automáticamente en cada PR, en una máquina virtual temporal: formato, tipos, tests en PGlite y tests en el contenedor. El resultado (✅ / ❌) aparece en el PR.
3. La rama `main` está **protegida**: no se puede mergear un PR con ❌ ni subir código directo a `main`.
4. Con ✅, se revisa y se mergea. No hace falta una segunda aprobación.
5. Vercel publica a producción solo desde `main`.

---

## 8. Plan por etapas

| Etapa | Contenido |
|---|---|
| 1. Base | Proyecto, CI, esquema, migraciones, vistas, permisos |
| 2. Lógica | FEFO, costo real, regalos, costo promedio, precio mínimo, redondeo, ofertas, pagos, resultado mensual, repartos (todo con tests) |
| 3. Catálogo | Productos, variantes, marcas, categorías, fotos |
| 4. Operación | Proveedores, compras (con pagos y aportes), venta rápida, ventas, inventario, cuadre, vencimientos y ofertas, precios |
| 5. Dinero y capital | Cuentas, depósitos, cierre de caja, socias, aportes, retiros, repartos, gastos |
| 6. Reportes | Inicio, resultado mensual y demás reportes, exportación |
| 7. Importación | Excel limpio → base |
| 8. Producción | Dominio, Vercel, Neon, R2, OAuth |

---

## 9. Datos a cargar después

- **Capital inicial** de Vanessa y Ericka: se carga cuando esté definido. El módulo de capital funciona desde el inicio, aunque empiece sin aportes registrados.

---

## 10. Para más adelante (fuera de esta primera versión)

- **Descuentos manuales y ventas por mayor:** límite de descuento solo sobre la ganancia (nunca debajo del costo real); precios por mayor configurables.
- **Combos y promociones armadas** (distintas de las ofertas por vencimiento).
- **Notificaciones** de ofertas a clientas.
- **Agente de WhatsApp** que consulta las vistas públicas.
- **Facturación electrónica.**
- **Página pública** (repositorio aparte).

---

## 11. Registro de decisiones

| # | Decisión |
|---|---|
| 1 | Proyecto propio para Soleil, sin multi-tienda; panel y página pública en repositorios separados |
| 2 | Panel con Material UI; página pública con Tailwind + shadcn (en su repositorio) |
| 3 | Producto + variantes (tono / tamaño), cada variante con su precio y su stock |
| 4 | Stock calculado por movimientos; nunca se vende sin stock |
| 5 | Lotes con vencimiento; se vende primero lo que vence antes (FEFO) |
| 6 | Costo real por lote con envío repartido por igual entre unidades y regalos del mismo producto |
| 7 | Regalos de otro producto: costo 0 y fuera del costo promedio |
| 8 | Utilidad con el costo real del lote; el costo promedio solo para el precio mínimo |
| 9 | Precio mínimo = costo promedio + 25% (o fijo, o el mayor), configurable por variante |
| 10 | Redondeo: exacto → 5 → 9,90, hacia arriba |
| 11 | Subida automática de precio con aviso; nunca baja solo; el panel no permite precios bajo el mínimo |
| 12 | Precio cobrado nunca menor al costo real; descuentos y por mayor quedan para después |
| 13 | Ofertas automáticas por vencimiento: 6 / 3 / 2 meses → 10% / 25% / 50% de la ganancia, solo para las unidades de ese lote, redondeo a 0,10 hacia abajo, nunca bajo costo, editables. La oferta termina al venderse esas unidades o al vencer el lote |
| 14 | El vencimiento solo se ve en el panel |
| 15 | Página pública: disponible / últimas unidades / agotado, sin cantidad exacta |
| 16 | Venta con varios medios de pago; efectivo → Caja; QR y transferencia → Banco; sin tarjeta |
| 17 | Compras pagadas por la tienda o por una o varias socias (aporte automático) |
| 18 | Capital por socia: aportes, retiro de capital, retiro de ganancias; porcentaje según capital, editable |
| 19 | Resultado mensual con gastos y pérdidas; lo no repartido se acumula como reinversión; repartos cuando se decida |
| 20 | Retiros de ganancias limitados a lo que tocó en los repartos |
| 21 | Gastos con categorías y gastos recurrentes (alquiler de dos armarios, 400 Bs/mes) |
| 22 | Cierre de caja opcional, sin fondo de cambio obligatorio |
| 23 | Dominio `.com` en Cloudflare, con "bolivia" en el nombre |
| 24 | Las unidades vencidas no se pueden vender; se dan de baja como pérdida |
| 25 | Capital inicial de las socias se carga después |
| 26 | Trabajo con pull requests; `main` protegida; GitHub Actions corre los tests en cada PR |
| 27 | Tests: unitarios, integración, secuencias aleatorias, concurrencia y permisos; PGlite + Postgres en contenedor; nunca contra Neon |
| 28 | Entornos separados: tests (temporal), desarrollo (rama de Neon) y producción |
| 29 | Cálculos de costo y precio con precisión exacta (fracciones de centavo); se redondea una sola vez, al final |
