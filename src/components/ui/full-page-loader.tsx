"use client";

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

/** Pantalla de carga mientras se confirma la sesión y se leen los colores de la tienda. */
export function FullPageLoader(): React.JSX.Element {
  return (
    <Box
      role="status"
      aria-label="Cargando"
      sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", bgcolor: "background.default" }}
    >
      <CircularProgress color="secondary" />
    </Box>
  );
}
