import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import {
  CONTEXT_MENU_THEME,
  MENU_HOVER_BACKGROUND,
  menuCheckColumn,
  menuContainerBase,
  menuItemButton,
  menuSectionLabel,
} from "./contextMenuStyles"
import { useLayerVisibility } from "../contexts/LayerVisibilityContext"
import type { LayerVisibilityState } from "../contexts/LayerVisibilityContext"

const LAYER_OPTIONS: Array<{ key: keyof LayerVisibilityState; label: string }> =
  [
    { key: "boardBody", label: "Board Body" },
    { key: "topCopper", label: "Top Copper" },
    { key: "bottomCopper", label: "Bottom Copper" },
    { key: "topSilkscreen", label: "Top Silkscreen" },
    { key: "bottomSilkscreen", label: "Bottom Silkscreen" },
    { key: "smtModels", label: "CAD Models" },
  ]

export const AppearanceMenu = () => {
  const { visibility, toggleLayer } = useLayerVisibility()
  const [showSubmenu, setShowSubmenu] = useState(false)
  const [hoveredLayer, setHoveredLayer] = useState<
    keyof LayerVisibilityState | null
  >(null)
  const [appearanceHovered, setAppearanceHovered] = useState(false)
  const [submenuPlacement, setSubmenuPlacement] = useState<"left" | "right">(
    "right",
  )
  const [submenuOffset, setSubmenuOffset] = useState(0)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)

  const updateSubmenuPlacement = useCallback(() => {
    if (!triggerRef.current || !submenuRef.current) return

    const margin = 8
    const triggerRect = triggerRef.current.getBoundingClientRect()
    const submenuRect = submenuRef.current.getBoundingClientRect()

    const needsLeftPlacement =
      triggerRect.right + submenuRect.width + 4 > window.innerWidth - margin

    setSubmenuPlacement(needsLeftPlacement ? "left" : "right")

    let offset = 0
    const bottomOverflow =
      triggerRect.top + submenuRect.height > window.innerHeight - margin
    const topOverflow = triggerRect.top < margin

    if (bottomOverflow) {
      offset = Math.min(
        0,
        window.innerHeight - margin - (triggerRect.top + submenuRect.height),
      )
    }

    if (topOverflow) {
      offset = Math.max(offset, margin - triggerRect.top)
    }

    setSubmenuOffset(offset)
  }, [])

  useLayoutEffect(() => {
    if (showSubmenu) {
      updateSubmenuPlacement()
    }
  }, [showSubmenu, updateSubmenuPlacement])

  useEffect(() => {
    if (!showSubmenu) return

    window.addEventListener("resize", updateSubmenuPlacement)

    return () => {
      window.removeEventListener("resize", updateSubmenuPlacement)
    }
  }, [showSubmenu, updateSubmenuPlacement])

  return (
    <div
      onMouseEnter={() => setShowSubmenu(true)}
      onMouseLeave={() => {
        setShowSubmenu(false)
        setAppearanceHovered(false)
        setHoveredLayer(null)
      }}
      style={{ position: "relative" }}
    >
      <button
        ref={triggerRef}
        type="button"
        style={{
          ...menuItemButton,
          justifyContent: "space-between",
          backgroundColor:
            showSubmenu || appearanceHovered
              ? MENU_HOVER_BACKGROUND
              : "transparent",
        }}
        onMouseEnter={() => setAppearanceHovered(true)}
        onMouseLeave={() => setAppearanceHovered(false)}
        onFocus={() => setShowSubmenu(true)}
        onBlur={() => setShowSubmenu(false)}
      >
        <span>Appearance</span>
        <span
          aria-hidden="true"
          style={{
            fontSize: 10,
            color: CONTEXT_MENU_THEME.subtleText,
            transform: showSubmenu ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.12s ease",
            display: "inline-block",
          }}
        >
          ▶
        </span>
      </button>

      {showSubmenu && (
        <div
          ref={submenuRef}
          role="menu"
          style={{
            ...menuContainerBase,
            position: "absolute",
            top: submenuOffset,
            left: submenuPlacement === "right" ? "calc(100% + 4px)" : undefined,
            right: submenuPlacement === "left" ? "calc(100% + 4px)" : undefined,
            minWidth: 200,
          }}
        >
          <div style={menuSectionLabel}>Layers</div>
          {LAYER_OPTIONS.map(({ key, label }) => {
            const isHovered = hoveredLayer === key
            const isChecked = visibility[key]
            return (
              <button
                key={key}
                type="button"
                role="menuitemcheckbox"
                aria-checked={isChecked}
                style={{
                  ...menuItemButton,
                  backgroundColor: isHovered
                    ? MENU_HOVER_BACKGROUND
                    : "transparent",
                }}
                onMouseEnter={() => setHoveredLayer(key)}
                onMouseLeave={() =>
                  setHoveredLayer((prev) => (prev === key ? null : prev))
                }
                onClick={() => toggleLayer(key)}
              >
                <span style={menuCheckColumn}>{isChecked ? "✓" : ""}</span>
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
