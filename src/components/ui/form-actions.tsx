"use client";

import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";

/**
 * Botones de un formulario de página (docs/UI.md §2): en la computadora van
 * al final del formulario; en el celular quedan fijos abajo, sobre la barra de
 * navegación, para tenerlos siempre a mano.
 */
export function FormActions({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return (
    <Paper
      elevation={0}
      sx={{
        position: { xs: "fixed", md: "static" },
        left: 0,
        right: 0,
        bottom: { xs: 64, md: "auto" },
        zIndex: "appBar",
        px: { xs: 2, md: 0 },
        py: { xs: 1.5, md: 0 },
        bgcolor: { xs: "background.paper", md: "transparent" },
        borderTop: { xs: 1, md: 0 },
        borderColor: "divider",
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        useFlexGap
        sx={{ justifyContent: { xs: "stretch", md: "flex-end" }, "& > *": { flex: { xs: 1, md: "none" } } }}
      >
        {children}
      </Stack>
    </Paper>
  );
}
