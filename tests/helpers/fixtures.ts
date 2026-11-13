/**
 * Datos de prueba mínimos, insertados con SQL directo.
 * Cada función crea una fila válida con valores por defecto razonables y
 * devuelve su id. Los tests sobrescriben solo lo que les importa.
 */

/** Cualquier cliente que ejecute SQL con parámetros (PGlite o pg). */
export interface SqlClient {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

let counter = 0;
const unique = (prefix: string): string => `${prefix}-${++counter}`;

async function insertReturningId(client: SqlClient, sql: string, params: unknown[]): Promise<string> {
  const { rows } = await client.query<{ id: string }>(sql, params);
  const row = rows[0];
  if (!row) throw new Error("La inserción no devolvió un id.");
  return row.id;
}

async function createBrand(client: SqlClient, overrides: { archived?: boolean } = {}): Promise<string> {
  const name = unique("Marca");
  return insertReturningId(client, "INSERT INTO brands (name, slug, archived_at) VALUES ($1, $2, $3) RETURNING id", [
    name,
    name.toLowerCase(),
    overrides.archived ? new Date() : null,
  ]);
}

async function createCategory(client: SqlClient): Promise<string> {
  const name = unique("Categoria");
  return insertReturningId(client, "INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id", [
    name,
    name.toLowerCase(),
  ]);
}

export async function createProduct(
  client: SqlClient,
  overrides: { published?: boolean; archived?: boolean; brandId?: string } = {},
): Promise<string> {
  const brandId = overrides.brandId ?? (await createBrand(client));
  const categoryId = await createCategory(client);
  const name = unique("Producto");
  return insertReturningId(
    client,
    `INSERT INTO products (name, slug, brand_id, category_id, published, archived_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      name,
      name.toLowerCase(),
      brandId,
      categoryId,
      overrides.published ?? true,
      overrides.archived ? new Date() : null,
    ],
  );
}

export async function createVariant(
  client: SqlClient,
  overrides: { productId?: string; salePriceBs?: string; minStock?: number | null; published?: boolean } = {},
): Promise<string> {
  const productId = overrides.productId ?? (await createProduct(client));
  return insertReturningId(
    client,
    `INSERT INTO product_variants (product_id, sku, sale_price_bs, min_stock, published)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [
      productId,
      unique("SKU"),
      overrides.salePriceBs ?? "280.00",
      overrides.minStock ?? null,
      overrides.published ?? true,
    ],
  );
}

export async function createPurchase(client: SqlClient): Promise<string> {
  const supplierId = await insertReturningId(client, "INSERT INTO suppliers (name) VALUES ($1) RETURNING id", [
    unique("Proveedor"),
  ]);
  return insertReturningId(
    client,
    "INSERT INTO purchases (supplier_id, purchase_date) VALUES ($1, CURRENT_DATE) RETURNING id",
    [supplierId],
  );
}

/**
 * Crea un lote y su movimiento de entrada, como lo hará el servicio de compras.
 * `expiresInDays` negativo o 0 crea un lote ya vencido.
 */
export async function createLotWithStock(
  client: SqlClient,
  variantId: string,
  options: { quantity?: number; costBs?: string; expiresInDays?: number | null } = {},
): Promise<string> {
  const purchaseId = await createPurchase(client);
  const quantity = options.quantity ?? 10;
  const expiresInDays = options.expiresInDays === undefined ? 365 : options.expiresInDays;
  const lotId = await insertReturningId(
    client,
    `INSERT INTO lots (purchase_id, variant_id, quantity, unit_price_bs, landed_unit_cost_bs, expires_on)
     VALUES ($1, $2, $3, $4, $4, CASE WHEN $5::int IS NULL THEN NULL ELSE CURRENT_DATE + $5::int END) RETURNING id`,
    [purchaseId, variantId, quantity, options.costBs ?? "200.00", expiresInDays],
  );
  await client.query(
    "INSERT INTO stock_movements (variant_id, lot_id, quantity, type, purchase_id) VALUES ($1, $2, $3, 'purchase', $4)",
    [variantId, lotId, quantity, purchaseId],
  );
  return lotId;
}

/** Id de una cuenta de dinero de los datos iniciales ("Caja" o "Banco"). */
export async function accountId(client: SqlClient, name: "Caja" | "Banco"): Promise<string> {
  return insertReturningId(client, "SELECT id FROM money_accounts WHERE name = $1", [name]);
}

/** Id de una socia de los datos iniciales. */
export async function partnerId(client: SqlClient, name: "Vanessa" | "Ericka"): Promise<string> {
  return insertReturningId(client, "SELECT id FROM partners WHERE name = $1", [name]);
}
