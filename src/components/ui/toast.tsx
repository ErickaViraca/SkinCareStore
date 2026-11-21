"use client";

import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";

/** Mensaje del aviso: si salió bien ("Marca guardada") o no. */
export interface ToastMessage {
  readonly text: string;
  readonly severity: "success" | "error";
}

interface ToastProps {
  /** Aviso a mostrar; `null` lo oculta. */
  readonly message: ToastMessage | null;
  readonly onClose: () => void;
}

/** Aviso breve al pie de la pantalla. Se cierra solo. */
export function Toast({ message, onClose }: ToastProps): React.JSX.Element {
  return (
    <Snackbar
      open={message !== null}
      autoHideDuration={3500}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      sx={{ bottom: { xs: 88, md: 24 } }}
    >
      <Alert severity={message?.severity ?? "success"} variant="filled" onClose={onClose} sx={{ width: "100%" }}>
        {message?.text}
      </Alert>
    </Snackbar>
  );
}
