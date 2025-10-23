import { useState } from "react"
import { useLayerVisibility } from "../contexts/LayerVisibilityContext"
import type React from "react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { CheckIcon, ChevronRightIcon } from "./Icons"

const itemStyles: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: 6,
  cursor: "default",
  outline: "none",
  userSelect: "none",
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#fafafa",
  fontWeight: 400,
  fontSize: 14,
  transition: "background-color 0.15s ease, color 0.15s ease",
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}

const separatorStyles: React.CSSProperties = {
  height: 1,
  backgroundColor: "#ffffff1a",
  margin: "4px 0",
}

const contentStyles: React.CSSProperties = {
  backgroundColor: "#262626",
  color: "#fafafa",
  borderRadius: 8,
  boxShadow:
    "0px 12px 48px -12px rgba(0, 0, 0, 0.5), 0px 8px 24px -8px rgba(0, 0, 0, 0.3)",
  border: "1px solid #333333",
  padding: "4px",
  minWidth: 160,
  zIndex: 10001,
  fontSize: 14,
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}

const iconContainerStyles: React.CSSProperties = {
  width: 16,
  height: 16,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  flexShrink: 0,
}

export const AppearanceMenu = () => {
  const { visibility, toggleLayer } = useLayerVisibility()
  const [appearanceSubOpen, setAppearanceSubOpen] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  return (
    <>
      <DropdownMenu.Separator style={separatorStyles} />

      <DropdownMenu.Sub onOpenChange={setAppearanceSubOpen}>
        <DropdownMenu.SubTrigger
          style={{
            ...itemStyles,
            backgroundColor:
              appearanceSubOpen || hoveredItem === "appearance"
                ? "#404040"
                : "transparent",
          }}
          onMouseEnter={() => setHoveredItem("appearance")}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <span style={iconContainerStyles} />
          <span style={{ flex: 1, display: "flex", alignItems: "center" }}>
            Appearance
          </span>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "flex-end",
              marginBottom: "-3px",
            }}
          >
            <ChevronRightIcon isOpen={appearanceSubOpen} />
          </div>
        </DropdownMenu.SubTrigger>

        <DropdownMenu.Portal>
          <DropdownMenu.SubContent
            style={{ ...contentStyles, marginLeft: -2 }}
            collisionPadding={10}
            avoidCollisions={true}
          >
            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "boardBody" ? "#404040" : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                toggleLayer("boardBody")
              }}
              onMouseEnter={() => setHoveredItem("boardBody")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span style={iconContainerStyles}>
                {visibility.boardBody && <CheckIcon />}
              </span>
              <span style={{ display: "flex", alignItems: "center" }}>
                Board Body
              </span>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "topCopper" ? "#404040" : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                toggleLayer("topCopper")
              }}
              onMouseEnter={() => setHoveredItem("topCopper")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span style={iconContainerStyles}>
                {visibility.topCopper && <CheckIcon />}
              </span>
              <span style={{ display: "flex", alignItems: "center" }}>
                Top Copper
              </span>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "bottomCopper" ? "#404040" : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                toggleLayer("bottomCopper")
              }}
              onMouseEnter={() => setHoveredItem("bottomCopper")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span style={iconContainerStyles}>
                {visibility.bottomCopper && <CheckIcon />}
              </span>
              <span style={{ display: "flex", alignItems: "center" }}>
                Bottom Copper
              </span>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "topSilkscreen" ? "#404040" : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                toggleLayer("topSilkscreen")
              }}
              onMouseEnter={() => setHoveredItem("topSilkscreen")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span style={iconContainerStyles}>
                {visibility.topSilkscreen && <CheckIcon />}
              </span>
              <span style={{ display: "flex", alignItems: "center" }}>
                Top Silkscreen
              </span>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "bottomSilkscreen"
                    ? "#404040"
                    : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                toggleLayer("bottomSilkscreen")
              }}
              onMouseEnter={() => setHoveredItem("bottomSilkscreen")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span style={iconContainerStyles}>
                {visibility.bottomSilkscreen && <CheckIcon />}
              </span>
              <span style={{ display: "flex", alignItems: "center" }}>
                Bottom Silkscreen
              </span>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "smtModels" ? "#404040" : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                toggleLayer("smtModels")
              }}
              onMouseEnter={() => setHoveredItem("smtModels")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span style={iconContainerStyles}>
                {visibility.smtModels && <CheckIcon />}
              </span>
              <span style={{ display: "flex", alignItems: "center" }}>
                CAD Models
              </span>
            </DropdownMenu.Item>
          </DropdownMenu.SubContent>
        </DropdownMenu.Portal>
      </DropdownMenu.Sub>
    </>
  )
}
