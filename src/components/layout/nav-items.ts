import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import AssessmentOutlined from "@mui/icons-material/AssessmentOutlined";
import EventBusyOutlined from "@mui/icons-material/EventBusyOutlined";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import LocalMallOutlined from "@mui/icons-material/LocalMallOutlined";
import MenuOutlined from "@mui/icons-material/MenuOutlined";
import PeopleAltOutlined from "@mui/icons-material/PeopleAltOutlined";
import PointOfSaleOutlined from "@mui/icons-material/PointOfSaleOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import ShoppingCartOutlined from "@mui/icons-material/ShoppingCartOutlined";
import SpaOutlined from "@mui/icons-material/SpaOutlined";
import WarehouseOutlined from "@mui/icons-material/WarehouseOutlined";
import { type SvgIconComponent } from "@mui/icons-material";

/**
 * Menú del panel (docs/UI.md §2). Los ítems con `available: false` todavía no
 * tienen pantalla: se muestran deshabilitados con "Próximamente" en vez de
 * llevar a una página inexistente.
 */
export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: SvgIconComponent;
  readonly available: boolean;
}

export const NAV_GROUPS: readonly (readonly NavItem[])[] = [
  [
    { href: "/", label: "Inicio", icon: HomeOutlined, available: true },
    { href: "/ventas/nueva", label: "Venta rápida", icon: PointOfSaleOutlined, available: false },
    { href: "/ventas", label: "Ventas", icon: ReceiptLongOutlined, available: false },
  ],
  [
    { href: "/productos", label: "Productos", icon: SpaOutlined, available: false },
    { href: "/compras", label: "Compras", icon: ShoppingCartOutlined, available: false },
    { href: "/inventario", label: "Inventario", icon: WarehouseOutlined, available: false },
    { href: "/por-vencer", label: "Por vencer y ofertas", icon: EventBusyOutlined, available: false },
  ],
  [
    { href: "/dinero", label: "Dinero", icon: AccountBalanceWalletOutlined, available: false },
    { href: "/capital", label: "Capital", icon: PeopleAltOutlined, available: false },
    { href: "/gastos", label: "Gastos", icon: LocalMallOutlined, available: false },
    { href: "/reportes", label: "Reportes", icon: AssessmentOutlined, available: false },
  ],
  [{ href: "/configuracion", label: "Configuración", icon: SettingsOutlined, available: false }],
];

/** Barra inferior del celular: Inicio, Vender, Productos y Más (abre el menú completo). */
export const BOTTOM_NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Inicio", icon: HomeOutlined, available: true },
  { href: "/ventas/nueva", label: "Vender", icon: PointOfSaleOutlined, available: false },
  { href: "/productos", label: "Productos", icon: Inventory2Outlined, available: false },
];

export const MORE_ICON = MenuOutlined;

/**
 * Devuelve el `href` del ítem que corresponde a la página actual: el más
 * específico que coincide ("/ventas/nueva" gana a "/ventas"). Inicio solo
 * coincide con "/".
 */
export function findActiveHref(hrefs: readonly string[], pathname: string): string | null {
  const matches = hrefs.filter((href) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`),
  );
  return matches.reduce<string | null>(
    (best, href) => (best === null || href.length > best.length ? href : best),
    null,
  );
}
