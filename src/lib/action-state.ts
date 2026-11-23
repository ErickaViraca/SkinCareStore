/**
 * Forma de la respuesta de una acción del servidor, vista desde la pantalla.
 * Coincide con `ActionResult` del servidor, pero los componentes no pueden
 * importar código de `src/server` (regla de arquitectura), así que la
 * declaran aquí con solo lo que muestran.
 */
export type MutationResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly error: { readonly message: string; readonly fieldErrors?: Readonly<Record<string, string>> };
    };

/** Una acción del servidor que la pantalla puede llamar. */
export type Mutation = (input: unknown) => Promise<MutationResult>;

/**
 * Error de un campo del formulario, si lo hay. Acepta varios nombres porque
 * un mismo campo puede venir como "variant.salePrice" (validación) o
 * "salePrice" (regla del servidor).
 */
export function fieldError(result: MutationResult | null | undefined, ...fields: string[]): string | undefined {
  if (!result || result.ok) return undefined;
  for (const field of fields) {
    const message = result.error.fieldErrors?.[field];
    if (message) return message;
  }
  return undefined;
}

/** Respuesta de una acción que además devuelve datos (por ejemplo, el id creado). */
export type MutationResultWith<T> = { readonly ok: true; readonly data: T } | Extract<MutationResult, { ok: false }>;
