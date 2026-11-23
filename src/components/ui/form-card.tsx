import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";

interface FormCardProps {
  readonly title: string;
  readonly subtitle?: string;
  /** Mensaje general de error del último envío, si lo hay. */
  readonly error?: string | null;
  readonly children: React.ReactNode;
}

/** Tarjeta de una sección de formulario: título, aviso de error y campos. */
export function FormCard({ title, subtitle, error, children }: FormCardProps): React.JSX.Element {
  return (
    <Card>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h2" sx={{ mb: subtitle ? 0 : 2 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {subtitle}
          </Typography>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
