"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useActionState } from "react";

import { type MutationResult } from "@/lib/action-state";

interface FormDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly submitLabel: string;
  /** Envía el formulario al servidor. */
  readonly onSubmit: (formData: FormData) => Promise<MutationResult>;
  readonly onSuccess: () => void;
  readonly onClose: () => void;
  /** Campos del formulario; reciben el último intento para mostrar errores y lo escrito. */
  readonly children: (attempt: FormAttempt | null) => React.ReactNode;
}

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
 * Ventana con un formulario corto (crear o editar).
 * Usa `useActionState` (guía de frontend §4): mientras se envía, el botón se
 * deshabilita; si el servidor rechaza, muestra el mensaje y los errores por campo.
 */
export function FormDialog(props: FormDialogProps): React.JSX.Element {
  const [attempt, submit, pending] = useActionState(
    async (previous: FormAttempt | null, formData: FormData): Promise<FormAttempt | null> => {
      const result = await props.onSubmit(formData);
      if (result.ok) {
        props.onSuccess();
        return null;
      }
      return { result, values: formValues(formData), count: (previous?.count ?? 0) + 1 };
    },
    null,
  );
  const result = attempt?.result;

  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="xs">
      <form action={submit} noValidate>
        <DialogTitle>{props.title}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
          {result && !result.ok && !result.error.fieldErrors && <Alert severity="error">{result.error.message}</Alert>}
          {props.children(attempt)}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" color="secondary" onClick={props.onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={pending}>
            {pending ? "Guardando…" : props.submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
