import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Soleil · Gestión",
  description: "Panel privado de gestión de Soleil",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">): React.JSX.Element {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
