"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { type MutationResult } from "@/lib/action-state";

import { type FormAttempt, useFormAttempt } from "./use-form-attempt";

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
 * Ventana con un formulario corto (crear o editar).
 * Usa `useActionState` (guía de frontend §4): mientras se envía, el botón se
 * deshabilita; si el servidor rechaza, muestra el mensaje y los errores por campo.
 */
export function FormDialog(props: FormDialogProps): React.JSX.Element {
  const [attempt, submit, pending] = useFormAttempt(props.onSubmit, props.onSuccess);
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
