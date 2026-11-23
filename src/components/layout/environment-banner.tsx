"use client";

import ScienceOutlined from "@mui/icons-material/ScienceOutlined";
import Box from "@mui/material/Box";

/**
 * Franja fija arriba de todo cuando el panel no es el oficial (ambiente de
 * pruebas o vista previa de un PR), para no confundir dónde se cargan datos.
 */
export function EnvironmentBanner({ label }: { readonly label: string | null }): React.JSX.Element | null {
  if (!label) return null;
  return (
    <Box
      role="status"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: "tooltip",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        px: 2,
        py: 0.75,
        bgcolor: "warning.main",
        color: "warning.contrastText",
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: "0.6px",
        textTransform: "uppercase",
        textAlign: "center",
      }}
    >
      <ScienceOutlined fontSize="small" />
      {label}: los datos de aquí no son los de la tienda
    </Box>
  );
}
