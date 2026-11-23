"use client";

import TextField from "@mui/material/TextField";

import { type FormAttempt } from "@/components/ui/use-form-attempt";
import { fieldError } from "@/lib/action-state";

interface NameFieldProps {
  readonly attempt: FormAttempt | null;
  /** Nombre actual al editar. */
  readonly initial: string | undefined;
  readonly example: string;
  readonly label?: string;
  readonly maxLength?: number;
  /** Pone el cursor en el campo al abrir (en las ventanas). */
  readonly autoFocus?: boolean;
}

/** Campo "Nombre" (marcas, categorías, productos): conserva lo escrito y muestra el error del servidor. */
export function NameField({
  attempt,
  initial,
  example,
  label = "Nombre",
  maxLength = 80,
  autoFocus = true,
}: NameFieldProps): React.JSX.Element {
  const error = fieldError(attempt?.result, "name");
  return (
    <TextField
      key={`name-${attempt?.count ?? 0}`}
      name="name"
      label={label}
      fullWidth
      defaultValue={attempt?.values.name ?? initial ?? ""}
      required
      autoFocus={autoFocus}
      error={Boolean(error)}
      helperText={error ?? `Por ejemplo: ${example}`}
      slotProps={{ htmlInput: { maxLength } }}
    />
  );
}
