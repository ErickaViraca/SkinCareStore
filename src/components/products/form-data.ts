import { type Cents } from "@/domain/money";

/**
 * Conversión entre el formulario (FormData) y lo que reciben las acciones del
 * servidor. El servidor vuelve a validar todo: esto solo arma el objeto.
 */

/** Prefijo de los campos de la variante dentro del formulario ("variant.sku"). */
export const VARIANT_PREFIX = "variant.";

const text = (formData: FormData, name: string): string => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

const checked = (formData: FormData, name: string): boolean => formData.get(name) === "on";

/** Datos comunes del producto. */
export function productInputFromForm(formData: FormData): Record<string, unknown> {
  return {
    name: text(formData, "name"),
    brandId: text(formData, "brandId"),
    categoryId: text(formData, "categoryId"),
    description: text(formData, "description"),
    usageInstructions: text(formData, "usageInstructions"),
    skinTypes: formData.getAll("skinTypes").filter((value): value is string => typeof value === "string"),
    published: checked(formData, "published"),
    featured: checked(formData, "featured"),
    comingSoon: checked(formData, "comingSoon"),
  };
}

/** Datos de una variante (campos con el prefijo "variant."). */
export function variantInputFromForm(formData: FormData): Record<string, unknown> {
  const field = (name: string): string => text(formData, `${VARIANT_PREFIX}${name}`);
  return {
    sku: field("sku"),
    barcode: field("barcode"),
    shade: field("shade"),
    presentation: field("presentation"),
    salePrice: field("salePrice"),
    minStock: field("minStock"),
    marginMode: field("marginMode"),
    marginPct: field("marginPct"),
    marginFixed: field("marginFixed"),
    published: checked(formData, `${VARIANT_PREFIX}published`),
  };
}

/** Centavos → texto para un campo de monto: 28990 → "289,90". */
export function centsToInput(amount: Cents | number | null): string {
  if (amount === null) return "";
  const whole = Math.floor(amount / 100);
  const fraction = String(amount % 100).padStart(2, "0");
  return `${whole},${fraction}`;
}
