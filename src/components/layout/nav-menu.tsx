"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { type Theme, alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { Fragment } from "react";

import { BrandLogo } from "./brand-logo";
import { NAV_GROUPS, type NavItem, findActiveHref } from "./nav-items";

export interface NavMenuProps {
  readonly storeName: string;
  readonly logoUrl: string | null;
  readonly adminName: string;
  readonly pathname: string;
  readonly signOutAction: () => Promise<void>;
  /** Se llama al elegir un ítem (en el celular cierra el menú). */
  readonly onNavigate?: () => void;
}

/** Línea divisoria tenue sobre la navegación (el color de sus letras, casi transparente). */
const navDivider = (theme: Theme): string => alpha(theme.palette.nav.contrastText, 0.14);

const ALL_HREFS = NAV_GROUPS.flat().map((item) => item.href);

/**
 * Contenido del menú lateral: logo, grupos de opciones y la usuaria abajo.
 * Se usa en la computadora (fijo) y en el celular (al tocar "Más").
 */
export function NavMenu(props: NavMenuProps): React.JSX.Element {
  const activeHref = findActiveHref(ALL_HREFS, props.pathname);
  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "nav.main", color: "nav.contrastText" }}
    >
      <Box sx={{ px: 3, py: 3 }}>
        <BrandLogo storeName={props.storeName} logoUrl={props.logoUrl} />
      </Box>
      <Box component="nav" aria-label="Menú principal" sx={{ flex: 1, overflowY: "auto", px: 1.5 }}>
        {NAV_GROUPS.map((group, index) => (
          <Fragment key={group[0]?.href ?? index}>
            {index > 0 && <Divider sx={{ my: 1, borderColor: navDivider }} />}
            <List dense disablePadding>
              {group.map((item) => (
                <NavMenuItem
                  key={item.href}
                  item={item}
                  active={item.href === activeHref}
                  onNavigate={props.onNavigate}
                />
              ))}
            </List>
          </Fragment>
        ))}
      </Box>
      <UserFooter adminName={props.adminName} signOutAction={props.signOutAction} />
    </Box>
  );
}

interface NavMenuItemProps {
  readonly item: NavItem;
  readonly active: boolean;
  readonly onNavigate: (() => void) | undefined;
}

function NavMenuItem({ item, active, onNavigate }: NavMenuItemProps): React.JSX.Element {
  const Icon = item.icon;
  return (
    <ListItemButton
      component={Link}
      href={item.href}
      disabled={!item.available}
      selected={active}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      sx={{
        borderRadius: 999,
        my: 0.25,
        color: "inherit",
        "&.Mui-selected, &.Mui-selected:hover": { bgcolor: "primary.main", color: "primary.contrastText" },
        "&.Mui-disabled": { opacity: 0.55 },
      }}
    >
      <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
        <Icon fontSize="small" />
      </ListItemIcon>
      <ListItemText
        primary={item.label}
        secondary={item.available ? undefined : "Próximamente"}
        slotProps={{
          primary: { sx: { fontWeight: active ? 700 : 500 } },
          secondary: { sx: { color: "inherit", fontSize: 11 } },
        }}
      />
    </ListItemButton>
  );
}

interface UserFooterProps {
  readonly adminName: string;
  readonly signOutAction: () => Promise<void>;
}

function UserFooter({ adminName, signOutAction }: UserFooterProps): React.JSX.Element {
  return (
    <Box
      sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.5, py: 2, borderTop: 1, borderColor: navDivider }}
    >
      <Avatar sx={{ bgcolor: "accent.main", color: "accent.contrastText", width: 34, height: 34, fontSize: 15 }}>
        {adminName.charAt(0).toUpperCase()}
      </Avatar>
      <Typography sx={{ flex: 1, fontWeight: 600 }} noWrap>
        {adminName}
      </Typography>
      <form action={signOutAction}>
        <Button type="submit" size="small" sx={{ color: "inherit" }}>
          Salir
        </Button>
      </form>
    </Box>
  );
}
