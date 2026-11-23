import SpaOutlined from "@mui/icons-material/SpaOutlined";
import Box from "@mui/material/Box";
import { type Theme, alpha } from "@mui/material/styles";

interface ProductThumbProps {
  readonly url: string | null;
  readonly alt: string;
  readonly size?: number;
}

/**
 * Foto cuadrada de un producto. Sin foto, un fondo degradado suave
 * (crema → verde claro) con un ícono, como en el boceto (docs/UI.md §5).
 */
export function ProductThumb({ url, alt, size = 48 }: ProductThumbProps): React.JSX.Element {
  const frame = { width: size, height: size, borderRadius: "10px", flexShrink: 0, overflow: "hidden" } as const;
  if (url) {
    return (
      <Box component="img" src={url} alt={alt} loading="lazy" sx={{ ...frame, objectFit: "cover", display: "block" }} />
    );
  }
  return (
    <Box
      aria-hidden
      sx={{
        ...frame,
        display: "grid",
        placeItems: "center",
        color: "accent.main",
        background: (theme: Theme) =>
          `linear-gradient(135deg, ${theme.palette.background.default}, ${alpha(theme.palette.secondary.main, 0.18)})`,
      }}
    >
      <SpaOutlined fontSize="small" />
    </Box>
  );
}
