"use client";

import { useActionState } from "react";

import { type MutationResult } from "@/lib/action-state";

/**
 * Último envío rechazado: el resultado (errores) y lo que se había escrito.
 * React vacía el formulario después de enviarlo; con `values` los campos
 * vuelven a mostrar lo escrito para que la usuaria solo corrija el error.
 */
export interface FormAttempt {
  readonly result: MutationResult;
  readonly values: Readonly<Record<string, string>>;
  /** Cambia en cada envío; sirve de `key` para que los campos tomen `values`. */
  readonly count: number;
}

function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") values[key] = value;
  });
  return values;
}

/**
 * Envío de un formulario con `useActionState` (guía de frontend §4).
 * Patrón: **Custom hook**, compartido por las ventanas y las páginas de formulario.
 */
export function useFormAttempt(
  onSubmit: (formData: FormData) => Promise<MutationResult>,
  onSuccess: () => void,
): readonly [FormAttempt | null, (formData: FormData) => void, boolean] {
  return useActionState(async (previous: FormAttempt | null, formData: FormData): Promise<FormAttempt | null> => {
    const result = await onSubmit(formData);
    if (result.ok) {
      onSuccess();
      return null;
    }
    return { result, values: formValues(formData), count: (previous?.count ?? 0) + 1 };
  }, null);
}

/** Valor inicial de un campo: lo escrito en el último intento o el valor guardado. */
export function initialValue(attempt: FormAttempt | null, name: string, saved: string | null | undefined): string {
  return attempt ? (attempt.values[name] ?? "") : (saved ?? "");
}
