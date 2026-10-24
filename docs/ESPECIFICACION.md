# Soleil — Sistema de gestión (panel privado)

Documento de especificación para revisar y discutir **antes de programar**.
Estado: borrador para revisión. Las decisiones abiertas están en la sección 9.

---

## 1. Objetivo y alcance

Sistema privado para administrar la tienda de dermocosmética **Soleil** (Cochabamba): productos, proveedores, compras, ventas, stock, precios y reportes. Reemplaza las planillas actuales ("cuadres", pedidos, ventas semanales).

- Usuarios: 2 administradoras, desde celular y computadora.
- Volumen: ~100–170 variantes de producto.
- Fuera de alcance por ahora: facturación electrónica, página pública (va en otro repositorio), agente de WhatsApp.

**Cómo se trabaja hoy (según el Excel) y qué cambia:**

| Hoy | Con el sistema |
|---|---|
| Las ventas se deducen comparando conteos ("había 11, ahora hay 7 → se vendieron 4") | Cada venta se registra en el momento, con precio real y canal |
| El stock se escribe a mano en cada cuadre | El stock se calcula solo a partir de compras, ventas y ajustes |
| El costo es "180-200-181" en una celda | Cada compra guarda su costo por lote; el costo promedio se calcula solo |
| Los nombres varían entre hojas ("FUSUION WATER", "FUSION WTER") | Un solo catálogo con código único por variante |
| La utilidad es aproximada | La utilidad sale del costo real de cada unidad vendida |
| El cuadre es la única forma de control | Se mantiene el **cuadre** (conteo físico) como pantalla, y las diferencias se registran como ajustes |

---

## 2. Arquitectura

| Tema | Decisión |
|---|---|
| Repositorios | **`SkinCareStore`** = panel privado y **dueño del esquema de la base de datos**. La página pública irá en **otro repositorio** y solo leerá vistas públicas |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Interfaz | Material UI (MUI), responsive, pensada para celular primero |
| Base de datos | Postgres en Neon (proyecto nuevo, separado de Xiaomi) con Drizzle ORM |
| Archivos | Cloudflare R2: bucket **público** para fotos de productos, bucket **privado** para facturas de compra (enlaces temporales) |
| Login | Google (Auth.js), solo los emails autorizados |
| Hosting | Vercel (proyecto nuevo) |
| Dominio | Propio (ver sección 9) |
| Tests | Vitest + pruebas con datos aleatorios (fast-check) + pruebas contra Postgres real |
| CI | GitHub Actions: formato, tipos, tests. No se integra código si algo falla |

**Estructura del repositorio:**

```
src/
  app/            pantallas y rutas (Next.js)
  domain/         lógica de negocio pura (sin base de datos), con sus tests
                  - fefo.ts        qué lote se descuenta primero
                  - costing.ts     costo real por lote y costo promedio
                  - pricing.ts     precio mínimo y redondeo
                  - profit.ts      utilidad
  server/         operaciones con la base de datos (transacciones)
  db/             esquema, migraciones, vistas públicas y permisos
docs/             esta especificación y decisiones
```

**Dinero:** en la base `numeric(12,2)`; en el código se maneja en **centavos enteros**, para evitar errores de redondeo.

---

## 3. Modelo de datos

🔒 = privado (nunca llega a la página pública).

### Catálogo

**settings** (una sola fila)
- `store_name`, teléfonos, direcciones, redes
- `default_margin_pct` = 25
- `default_min_stock` = 2
- `expiry_alert_days` = 60
- `price_rounding` = `"5_9"` (ver regla 4.5)

**brands** — `id, name (único), slug, logo_url, archived_at`

**categories** — `id, name (único), slug, parent_id, archived_at`

**products** (lo común a todas sus variantes)
- `id, name, slug, brand_id, category_id, description, usage_instructions`
- `skin_types text[]` (grasa, seca, mixta, sensible, con acné, con manchas, madura, todo tipo)
- `published, featured, archived_at, created_at, updated_at`

**product_variants** (lo que se vende y se cuenta)
- `id, product_id, sku (único), barcode`
- `shade` (tono) y `presentation` (tamaño); ambos opcionales
- `sale_price_bs` — precio de venta público
- `min_stock` — vacío = usa `settings.default_min_stock`
- `margin_mode` — `pct` | `fixed` | `max`; vacío = usa el de la tienda (25%)
- `margin_pct`, `margin_fixed_bs`
- `price_auto_raised_at` — se llena cuando el sistema subió el precio solo (aviso pendiente de revisar)
- `published, archived_at`

**product_images** — `id, product_id, variant_id (opcional), url, alt, order`

### Operación 🔒

**admin_users** — `id, email, name, active`

**suppliers** — `id, name, city, contact_name, phone, notes, active`

**purchases**
- `id, supplier_id, purchase_date, invoice_number, invoice_file_key` (R2 privado)
- `shipping_cost_bs` (envío o flota)
- `status` (registered | voided), `notes, created_by, created_at`

**lots** (cada línea de compra es un lote)
- `id, purchase_id, variant_id`
- `quantity` (unidades pagadas), `free_quantity` (unidades de regalo, por ejemplo promo 10+1)
- `unit_price_bs` (precio pagado por unidad)
- `landed_unit_cost_bs` — **costo real por unidad** (con envío y regalos incluidos; ver 4.2)
- `lot_code, expires_on`

**sales**
- `id, sale_number (correlativo), sold_at`
- `channel`: tienda | whatsapp | instagram | facebook | tiktok | otro
- `payment_method`: efectivo | qr | transferencia | tarjeta
- `customer_name, customer_phone` (opcionales)
- `discount_bs, total_bs, status` (completed | voided), `void_reason, created_by`

**sale_items**
- `id, sale_id, variant_id, quantity`
- `list_price_bs` (precio de catálogo en ese momento), `unit_price_bs` (cobrado)
- `unit_cost_bs` (costo real de los lotes consumidos)

**stock_movements**
- `id, variant_id, lot_id, quantity` (con signo)
- `type`: initial | purchase | sale | sale_void | adjustment | expired | damaged | sample | supplier_return | count
- `purchase_id, sale_item_id, count_id, reason, created_by, created_at`

**inventory_counts** (cuadre) — `id, counted_at, status (open | closed), notes, created_by`
**inventory_count_lines** — `count_id, variant_id, expected_qty, counted_qty`

**price_changes** (historial) — `id, variant_id, old_price, new_price, reason (manual | auto_cost), created_by, created_at`

### Vistas

| Vista | Uso |
|---|---|
| `v_lot_stock` 🔒 | Saldo por lote |
| `v_variant_stock` 🔒 | Stock, costo promedio, precio mínimo y si está bajo |
| `public_catalog` | Para la página pública: producto, variantes, marca, categoría, tipos de piel, presentación, tono, **precio, stock, disponibilidad, próximo vencimiento (mes/año)**, fotos. Solo lo publicado y no archivado |
| `public_brands`, `public_categories`, `public_settings` | Datos públicos |

La página pública y el futuro agente de WhatsApp se conectan con un usuario de base de datos que **solo puede leer las vistas `public_*`**.

---

## 4. Reglas de negocio

### 4.1 Stock
- Stock = suma de `stock_movements`. Nunca se edita a mano.
- No se puede vender más de lo que hay (bloqueo en la base, dentro de una transacción con bloqueo de lotes, para que las 2 admins no vendan la misma última unidad).
- Al vender se descuenta primero el lote que **vence antes** (FEFO).
- Ventas y compras **no se borran: se anulan**, generando los movimientos inversos.
- Una compra solo se puede anular si sus unidades no se vendieron.

### 4.2 Costo real por unidad (por lote)
```
costo real = (cantidad pagada × precio unitario + parte del envío)
             / (cantidad pagada + unidades de regalo)
```
El envío de una compra se reparte entre sus líneas **según el valor de cada línea**.

Ejemplo: 10 Active Unify a 220 + 1 de regalo, envío de 15 Bs (único producto de la compra) → (2200 + 15) / 11 = **201,36 Bs**.

### 4.3 Costo promedio del stock (por variante)
Promedio ponderado del costo real de las unidades **que quedan hoy**:
```
costo promedio = Σ(saldo del lote × costo real del lote) / Σ(saldo del lote)
```
Sin stock: se usa el costo real del último lote comprado.

### 4.4 Precio mínimo
```
modo %     → costo promedio × (1 + margen%)
modo fijo  → costo promedio + ganancia fija Bs
modo mayor → el más alto de los dos
precio mínimo = redondeo_5_9(resultado)
```

### 4.5 Redondeo "5 / 9" (precio psicológico)
Se redondea **siempre hacia arriba** al número entero más cercano que **termine en 5 o en 9**:

| Calculado | Resultado |
|---|---|
| 251,20 | 255 |
| 255,00 | 255 |
| 256,10 | 259 |
| 259,00 | 259 |
| 259,40 | 265 |
| 250,00 | 255 |

Se aplica a los precios que **calcula el sistema** (mínimo, sugerido, subida automática). Un precio puesto a mano puede ser cualquiera, siempre que no sea menor al mínimo.

### 4.6 Precio de venta
- El panel **no permite** guardar un precio menor al precio mínimo (validación en pantalla **y** en la base).
- Se recalcula el mínimo en cada compra, venta, ajuste o anulación.
- Si el precio actual queda por debajo del nuevo mínimo, el sistema lo **sube automáticamente** al mínimo, lo registra en `price_changes` y marca la variante con un aviso hasta que una admin lo revise.
- Los precios **nunca bajan solos**. Si el costo baja, el panel solo sugiere.

### 4.7 Alertas
- Stock bajo: stock ≤ stock mínimo (de la variante o de la tienda).
- Por vencer: lotes que vencen dentro de `expiry_alert_days`.
- Precio subido automáticamente, pendiente de revisar.

---

## 5. Pantallas del panel

1. **Login** con Google.
2. **Inicio:** ventas de hoy y del mes, utilidad del mes, alertas (stock bajo, por vencer, precios ajustados), botón grande "Nueva venta".
3. **Venta rápida (celular primero):** buscar por nombre, código o tono, elegir cantidad, precio sugerido, canal y método de pago con un toque. Varios productos por venta.
4. **Ventas:** lista con filtros, detalle, anular con motivo.
5. **Productos:** lista con búsqueda y filtros; ficha con datos comunes, fotos y **variantes** (tono, tamaño, precio, stock mínimo, margen). Por variante: stock por lote, costo promedio, precio mínimo, historial de precios y de movimientos. Publicar / archivar.
6. **Marcas y categorías.**
7. **Proveedores:** lista, ficha, historial de compras.
8. **Compras:** lista; nueva compra con proveedor, fecha, factura (foto o PDF), envío y líneas (variante, cantidad, regalo, precio, lote, vencimiento). Aviso si un costo difiere mucho del anterior.
9. **Inventario:** stock actual, por vencer, ajustes con motivo y **cuadre** (conteo físico → diferencias → ajustes).
10. **Precios:** variantes con precio subido automáticamente o por debajo del sugerido.
11. **Reportes:** ventas por día, mes y canal; utilidad por producto y total; más vendidos. Exportar a Excel.
12. **Importar Excel:** vista previa con errores por fila → crea productos, variantes y la compra "Inventario inicial".
13. **Configuración:** datos de la tienda, márgenes, stock mínimo, alertas.

---

## 6. Contrato con la página pública (otro repositorio)

- Solo lectura de las vistas `public_*` con un usuario de base de datos limitado.
- Muestra: nombre, marca, categoría, descripción, modo de uso, tipos de piel, presentación, tono, **precio, stock, disponibilidad y próximo vencimiento**, fotos.
- Nunca: costos, proveedores, compras, ventas, márgenes ni utilidades.
- El precio público ya llega validado (≥ precio mínimo).

---

## 7. Calidad

- Toda la lógica de `src/domain` con tests unitarios antes de usarse.
- Pruebas con secuencias aleatorias de compras, ventas, anulaciones y ajustes que verifican siempre:
  - el stock nunca es negativo;
  - la suma de saldos por lote = stock de la variante;
  - el precio de venta nunca es menor al mínimo;
  - la utilidad total = ventas − costo de lo vendido.
- Pruebas contra Postgres real de transacciones, bloqueos y restricciones.
- CI obligatorio en GitHub Actions.

---

## 8. Plan por etapas

| Etapa | Contenido |
|---|---|
| 1. Base | Proyecto, CI, esquema, migraciones, vistas, permisos |
| 2. Lógica | FEFO, costo real, costo promedio, precio mínimo, redondeo 5/9, utilidad (con tests) |
| 3. Catálogo | Productos, variantes, marcas, categorías, fotos |
| 4. Operación | Proveedores, compras, venta rápida, ventas, inventario, cuadre, precios |
| 5. Reportes | Inicio, reportes, exportación |
| 6. Importación | Excel limpio → base |
| 7. Producción | Dominio, Vercel, Neon, R2, OAuth |

---

## 9. Decisiones abiertas

1. **Descuentos al registrar una venta:** ¿se permite cobrar menos que el precio mínimo (por ejemplo, a una amiga o por mayor)? Opciones: (a) nunca; (b) solo hasta el costo promedio, con confirmación; (c) libre con confirmación.
2. **Quién pagó cada compra:** en el Excel aparecen "PAGO VANE", "PAGO ERIKA", "INVERSIÓN VANE". ¿Necesitan registrar qué socia pagó cada compra o aportó capital?
3. **Próximo vencimiento en la página pública:** ¿mostrarlo (mes/año) como prueba de originalidad y frescura?
4. **Stock en la página pública:** ¿cantidad exacta ("quedan 3") o solo disponible / últimas unidades / agotado?
5. **Redondeo de 250,00 exacto:** con la regla 5/9 pasa a 255. ¿Correcto, o se permite que termine en 0 cuando el cálculo es exacto?
6. **Dominio:** `.com.bo` (NIC Bolivia) o `.com` (Cloudflare). Nombre a definir.
