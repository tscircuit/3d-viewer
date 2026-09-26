import type { CSSProperties } from "react"

/** Radix measures the space left after collision detection for each menu. */
export const menuViewportStyles: CSSProperties = {
  boxSizing: "border-box",
  minWidth: "min(160px, calc(100vw - 20px))",
  maxWidth: "calc(100vw - 20px)",
  maxHeight:
    "var(--radix-dropdown-menu-content-available-height, calc(100dvh - 20px))",
  overflowY: "auto",
  overflowX: "hidden",
  overscrollBehavior: "contain",
  overflowWrap: "anywhere",
}
