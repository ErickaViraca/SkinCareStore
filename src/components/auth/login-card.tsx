"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { useFormStatus } from "react-dom";

import { BrandLogo } from "@/components/layout/brand-logo";

interface LoginCardProps {
  readonly storeName: string;
  readonly logoUrl: string | null;
  /** Mensaje si el ingreso anterior falló (por ejemplo, cuenta sin acceso). */
  readonly errorMessage: string | null;
  readonly signInAction: () => Promise<void>;
}

/** Pantalla de ingreso (§4.16): un solo botón "Ingresar con Google". */
export function LoginCard({ storeName, logoUrl, errorMessage, signInAction }: LoginCardProps): React.JSX.Element {
  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", px: 2, bgcolor: "background.default" }}
    >
      <Card sx={{ width: "100%", maxWidth: 400 }}>
        <CardContent sx={{ p: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <Box sx={{ color: "nav.main" }}>
            <BrandLogo storeName={storeName} logoUrl={logoUrl} height={48} />
          </Box>
          <Typography variant="h1" sx={{ fontSize: 22, textAlign: "center" }}>
            Panel de gestión
          </Typography>
          {errorMessage && (
            <Alert severity="error" sx={{ width: "100%" }}>
              {errorMessage}
            </Alert>
          )}
          <Box component="form" action={signInAction} sx={{ width: "100%" }}>
            <SubmitButton />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

/** Botón que se deshabilita mientras se envía, para no abrir Google dos veces. */
function SubmitButton(): React.JSX.Element {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="contained" size="large" fullWidth disabled={pending}>
      {pending ? "Abriendo Google…" : "Ingresar con Google"}
    </Button>
  );
}
