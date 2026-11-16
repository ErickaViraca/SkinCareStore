import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface PageHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  /** Botones de la página (arriba a la derecha en la computadora). */
  readonly actions?: React.ReactNode;
}

/** Encabezado de cada página del panel: título con la fuente de títulos, subtítulo y acciones. */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps): React.JSX.Element {
  return (
    <Box
      component="header"
      sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 2, mb: 3 }}
    >
      <Box>
        <Typography variant="h1" sx={{ fontSize: { md: 28 } }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions}
    </Box>
  );
}
