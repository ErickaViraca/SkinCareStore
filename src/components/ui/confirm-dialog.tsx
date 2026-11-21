"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useState, useTransition } from "react";

import { type MutationResult } from "@/lib/action-state";

interface ConfirmDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly onConfirm: () => Promise<MutationResult>;
  readonly onSuccess: () => void;
  readonly onClose: () => void;
}

/** Confirmación antes de una acción que quita algo de la vista (archivar, anular). Botón en rojo. */
export function ConfirmDialog(props: ConfirmDialogProps): React.JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const close = (): void => {
    setError(null);
    props.onClose();
  };

  const confirm = (): void => {
    startTransition(async () => {
      const result = await props.onConfirm();
      if (result.ok) {
        setError(null);
        props.onSuccess();
      } else {
        setError(result.error.message);
      }
    });
  };

  return (
    <Dialog open={props.open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>{props.title}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <DialogContentText>{props.message}</DialogContentText>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="outlined" color="secondary" onClick={close} disabled={pending}>
          Cancelar
        </Button>
        <Button variant="contained" color="error" onClick={confirm} disabled={pending}>
          {pending ? "Un momento…" : props.confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
