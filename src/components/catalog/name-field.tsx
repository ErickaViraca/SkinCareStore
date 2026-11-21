"use client";

import TextField from "@mui/material/TextField";

import { type FormAttempt } from "@/components/ui/form-dialog";
import { fieldError } from "@/lib/action-state";

interface NameFieldProps {
  readonly attempt: FormAttempt | null;
  /** Nombre actual al editar. */
  readonly initial: string | undefined;
  readonly example: string;
}

/** Campo "Nombre" de marcas y categorías: conserva lo escrito y muestra el error del servidor. */
export function NameField({ attempt, initial, example }: NameFieldProps): React.JSX.Element {
  const error = fieldError(attempt?.result, "name");
  return (
    <TextField
      key={`name-${attempt?.count ?? 0}`}
      name="name"
      label="Nombre"
      defaultValue={attempt?.values.name ?? initial ?? ""}
      required
      autoFocus
      error={Boolean(error)}
      helperText={error ?? `Por ejemplo: ${example}`}
      slotProps={{ htmlInput: { maxLength: 80 } }}
    />
  );
}
