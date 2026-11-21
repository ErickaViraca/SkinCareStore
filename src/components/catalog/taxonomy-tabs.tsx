"use client";

import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/catalogo/marcas", label: "Marcas" },
  { href: "/catalogo/categorias", label: "Categorías" },
] as const;

/** Pestañas de "Marcas y categorías". Cada una es su propia página (se puede enlazar). */
export function TaxonomyTabs(): React.JSX.Element {
  const pathname = usePathname();
  const active = TABS.find((tab) => pathname.startsWith(tab.href))?.href ?? false;
  return (
    <Tabs
      value={active}
      textColor="inherit"
      sx={{
        mb: 3,
        borderBottom: 1,
        borderColor: "divider",
        "& .MuiTab-root": { fontWeight: 600 },
        "& .MuiTabs-indicator": { bgcolor: "primary.main", height: 3 },
        color: "nav.main",
      }}
    >
      {TABS.map((tab) => (
        <Tab key={tab.href} value={tab.href} label={tab.label} component={Link} href={tab.href} />
      ))}
    </Tabs>
  );
}
