import { useState } from "react"
import { useLayerVisibility } from "../contexts/LayerVisibilityContext"
import type React from "react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"

const itemStyles: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 6,
  cursor: "default",
  outline: "none",
  userSelect: "none",
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#e4e4e7",
  fontWeight: 400,
  fontSize: 14,
  transition: "background-color 0.12s ease",
}

const checkmarkStyle: React.CSSProperties = {
  width: 20,
  fontSize: 14,
}

const separatorStyles: React.CSSProperties = {
  height: 1,
  backgroundColor: "rgba(255, 255, 255, 0.08)",
  margin: "6px 0",
}

const contentStyles: React.CSSProperties = {
  backgroundColor: "#1e1e1e",
  color: "#e4e4e7",
  borderRadius: 8,
  boxShadow:
    "0px 10px 40px -10px rgba(0, 0, 0, 0.5), 0px 0px 0px 1px rgba(255, 255, 255, 0.08)",
  border: "none",
  padding: "6px",
  minWidth: 220,
  zIndex: 10001,
  fontSize: 14,
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
            justifyContent: "space-between",
            backgroundColor:
              appearanceSubOpen || hoveredItem === "appearance"
                ? "rgba(255, 255, 255, 0.1)"
                : "transparent",
          }}
          onMouseEnter={() => setHoveredItem("appearance")}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <span>Appearance</span>
          <span
            style={{
              display: "inline-block",
              transition: "transform 0.2s ease",
              marginLeft: 4,
              opacity: 0.7,
              transform: appearanceSubOpen ? "rotate(90deg)" : "rotate(0deg)",
            }}
          >
            ›
          </span>
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
                  hoveredItem === "boardBody"
                    ? "rgba(255, 255, 255, 0.1)"
                    : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                toggleLayer("boardBody")
              }}
              onMouseEnter={() => setHoveredItem("boardBody")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span style={checkmarkStyle}>
                {visibility.boardBody ? "✓" : ""}
              </span>
              Board Body
            </DropdownMenu.Item>

            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "topCopper"
                    ? "rgba(255, 255, 255, 0.1)"
                    : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                toggleLayer("topCopper")
              }}
              onMouseEnter={() => setHoveredItem("topCopper")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span style={checkmarkStyle}>
                {visibility.topCopper ? "✓" : ""}
              </span>
              Top Copper
            </DropdownMenu.Item>

            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "bottomCopper"
                    ? "rgba(255, 255, 255, 0.1)"
                    : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                toggleLayer("bottomCopper")
              }}
              onMouseEnter={() => setHoveredItem("bottomCopper")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span style={checkmarkStyle}>
                {visibility.bottomCopper ? "✓" : ""}
              </span>
              Bottom Copper
            </DropdownMenu.Item>

            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "topSilkscreen"
                    ? "rgba(255, 255, 255, 0.1)"
                    : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                toggleLayer("topSilkscreen")
              }}
              onMouseEnter={() => setHoveredItem("topSilkscreen")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span style={checkmarkStyle}>
                {visibility.topSilkscreen ? "✓" : ""}
              </span>
              Top Silkscreen
            </DropdownMenu.Item>

            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "bottomSilkscreen"
                    ? "rgba(255, 255, 255, 0.1)"
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
              <span style={checkmarkStyle}>
                {visibility.bottomSilkscreen ? "✓" : ""}
              </span>
              Bottom Silkscreen
            </DropdownMenu.Item>

            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "smtModels"
                    ? "rgba(255, 255, 255, 0.1)"
                    : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                toggleLayer("smtModels")
              }}
              onMouseEnter={() => setHoveredItem("smtModels")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span style={checkmarkStyle}>
                {visibility.smtModels ? "✓" : ""}
              </span>
              CAD Models
            </DropdownMenu.Item>
          </DropdownMenu.SubContent>
        </DropdownMenu.Portal>
      </DropdownMenu.Sub>
    </>
  )
}
