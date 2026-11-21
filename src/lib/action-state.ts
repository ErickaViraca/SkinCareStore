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

/** Error de un campo del formulario, si lo hay. */
export function fieldError(result: MutationResult | null | undefined, field: string): string | undefined {
  return result && !result.ok ? result.error.fieldErrors?.[field] : undefined;
}
