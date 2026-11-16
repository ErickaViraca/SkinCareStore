"use client";

import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Paper from "@mui/material/Paper";
import Toolbar from "@mui/material/Toolbar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { BrandLogo } from "./brand-logo";
import { BOTTOM_NAV_ITEMS, MORE_ICON, findActiveHref } from "./nav-items";
import { NavMenu } from "./nav-menu";

export interface AppShellProps {
  readonly storeName: string;
  readonly logoUrl: string | null;
  readonly adminName: string;
  readonly signOutAction: () => Promise<void>;
  readonly children: React.ReactNode;
}

const SIDEBAR_WIDTH = 248;
const MORE_VALUE = "mas";
const BOTTOM_HREFS = BOTTOM_NAV_ITEMS.map((item) => item.href);

/**
 * Estructura del panel (docs/UI.md §2).
 * - Computadora: menú lateral fijo en verde oscuro.
 * - Celular: barra superior con logo y avatar, y barra inferior con Inicio,
 *   Vender, Productos y Más (abre el menú completo).
 * Patrón: **Composición**: cada página llega como `children`.
 */
export function AppShell({ storeName, logoUrl, adminName, signOutAction, children }: AppShellProps): React.JSX.Element {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuProps = { storeName, logoUrl, adminName, pathname, signOutAction };

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh" }}>
      <Box
        component="aside"
        sx={{
          display: { xs: "none", md: "block" },
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          position: "sticky",
          top: 0,
          height: "100dvh",
        }}
      >
        <NavMenu {...menuProps} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <MobileTopBar storeName={storeName} logoUrl={logoUrl} adminName={adminName} />
        <Box component="main" sx={{ flex: 1, px: { xs: 2, md: 4.5 }, pt: { xs: 2, md: 4 }, pb: { xs: 12, md: 4 } }}>
          {children}
        </Box>
      </Box>

      <MobileBottomNav pathname={pathname} onMore={() => setMenuOpen(true)} />

      <Drawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        sx={{ display: { md: "none" } }}
        slotProps={{ paper: { sx: { width: SIDEBAR_WIDTH + 32 } } }}
      >
        <NavMenu {...menuProps} onNavigate={() => setMenuOpen(false)} />
      </Drawer>
    </Box>
  );
}

interface MobileTopBarProps {
  readonly storeName: string;
  readonly logoUrl: string | null;
  readonly adminName: string;
}

function MobileTopBar({ storeName, logoUrl, adminName }: MobileTopBarProps): React.JSX.Element {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{ display: { md: "none" }, bgcolor: "nav.main", color: "nav.contrastText" }}
    >
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <BrandLogo storeName={storeName} logoUrl={logoUrl} height={28} />
        <Avatar
          aria-label={adminName}
          sx={{ bgcolor: "accent.main", color: "accent.contrastText", width: 32, height: 32, fontSize: 14 }}
        >
          {adminName.charAt(0).toUpperCase()}
        </Avatar>
      </Toolbar>
    </AppBar>
  );
}

interface MobileBottomNavProps {
  readonly pathname: string;
  readonly onMore: () => void;
}

function MobileBottomNav({ pathname, onMore }: MobileBottomNavProps): React.JSX.Element {
  const MoreIcon = MORE_ICON;
  return (
    <Paper
      component="nav"
      aria-label="Navegación principal"
      square
      sx={{ display: { md: "none" }, position: "fixed", left: 0, right: 0, bottom: 0, zIndex: "appBar" }}
    >
      <BottomNavigation
        showLabels
        value={findActiveHref(BOTTOM_HREFS, pathname) ?? false}
        sx={{
          bgcolor: "nav.main",
          height: 64,
          "& .MuiBottomNavigationAction-root": { color: "nav.contrastText", borderRadius: 999, my: 1, mx: 0.5 },
          "& .MuiBottomNavigationAction-root.Mui-selected": { bgcolor: "primary.main", color: "primary.contrastText" },
          "& .Mui-disabled": { opacity: 0.55 },
        }}
      >
        {BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <BottomNavigationAction
              key={item.href}
              value={item.href}
              label={item.label}
              icon={<Icon />}
              component={Link}
              href={item.href}
              disabled={!item.available}
            />
          );
        })}
        <BottomNavigationAction value={MORE_VALUE} label="Más" icon={<MoreIcon />} onClick={onMore} />
      </BottomNavigation>
    </Paper>
  );
}
