import type { CSSProperties } from "react"

export const CONTEXT_MENU_THEME = {
  background: "#ffffff",
  textColor: "#1f2328",
  borderColor: "rgba(15, 23, 42, 0.12)",
  hoverBackground: "#f3f4f6",
  subtleText: "#64748b",
  shadow: "0px 16px 32px rgba(15, 23, 42, 0.16)",
  checkColor: "#2563eb",
}

export const menuContainerBase: CSSProperties = {
  backgroundColor: CONTEXT_MENU_THEME.background,
  color: CONTEXT_MENU_THEME.textColor,
  border: `1px solid ${CONTEXT_MENU_THEME.borderColor}`,
  borderRadius: 8,
  boxShadow: CONTEXT_MENU_THEME.shadow,
  padding: 4,
  minWidth: 208,
  fontSize: 13,
  lineHeight: 1.4,
}

export const menuItemButton: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "100%",
  border: "none",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  padding: "8px 12px",
  borderRadius: 6,
  font: "inherit",
  textAlign: "left",
  transition: "background-color 0.12s ease, color 0.12s ease",
}

export const menuCheckColumn: CSSProperties = {
  width: 16,
  display: "inline-flex",
  justifyContent: "center",
  color: CONTEXT_MENU_THEME.checkColor,
  fontWeight: 600,
}

export const menuDetailText: CSSProperties = {
  marginLeft: "auto",
  fontSize: 12,
  color: CONTEXT_MENU_THEME.subtleText,
  fontWeight: 400,
}

export const menuSeparator: CSSProperties = {
  height: 1,
  margin: "4px 0",
  backgroundColor: "rgba(15, 23, 42, 0.08)",
}

export const menuFooterText: CSSProperties = {
  fontSize: 11,
  color: CONTEXT_MENU_THEME.subtleText,
  textAlign: "center",
  padding: "8px 0 4px",
}

export const menuSectionLabel: CSSProperties = {
  fontSize: 11,
  color: CONTEXT_MENU_THEME.subtleText,
  padding: "6px 12px 4px",
  textTransform: "uppercase",
  letterSpacing: 0.5,
}

export const MENU_HOVER_BACKGROUND = CONTEXT_MENU_THEME.hoverBackground
