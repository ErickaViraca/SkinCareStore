/** Filtro de la lista de marcas y categorías: búsqueda sin importar mayúsculas ni tildes. */

interface FilterableRow {
  readonly name: string;
  readonly detail: string | null;
  readonly archived: boolean;
}

/** Texto comparable: minúsculas y sin tildes ("Sérum" → "serum"). */
export function normalizeForSearch(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Filas que coinciden con la búsqueda (en el nombre o el detalle). Las archivadas solo si se piden. */
export function filterRows<T extends FilterableRow>(rows: readonly T[], query: string, showArchived: boolean): T[] {
  const needle = normalizeForSearch(query);
  return rows.filter(
    (row) =>
      (showArchived || !row.archived) &&
      (needle === "" || normalizeForSearch(`${row.name} ${row.detail ?? ""}`).includes(needle)),
  );
}
