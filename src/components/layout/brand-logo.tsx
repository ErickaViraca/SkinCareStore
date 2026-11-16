import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface BrandLogoProps {
  readonly storeName: string;
  readonly logoUrl: string | null;
  /** Alto del logo en píxeles. */
  readonly height?: number;
}

/**
 * Logo de la tienda. Si todavía no se subió una imagen en Configuración,
 * muestra el nombre con la fuente de títulos. Toma el color del contenedor
 * (blanco sobre la navegación, verde oscuro sobre el fondo).
 */
export function BrandLogo({ storeName, logoUrl, height = 32 }: BrandLogoProps): React.JSX.Element {
  if (logoUrl) {
    return <Box component="img" src={logoUrl} alt={storeName} sx={{ height, width: "auto", display: "block" }} />;
  }
  return (
    <Typography
      component="span"
      sx={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 700, fontSize: height * 0.8, lineHeight: 1 }}
    >
      {storeName}
    </Typography>
  );
}
