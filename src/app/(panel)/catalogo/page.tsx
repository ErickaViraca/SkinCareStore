import { redirect } from "next/navigation";

/** "Marcas y categorías" abre en la pestaña de marcas. */
export default function CatalogPage(): never {
  redirect("/catalogo/marcas");
}
