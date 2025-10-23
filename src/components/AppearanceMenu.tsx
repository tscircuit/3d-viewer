import { useState } from "react"
import { useLayerVisibility } from "../contexts/LayerVisibilityContext"
import type React from "react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { CheckIcon, ChevronRightIcon } from "./Icons"

const itemStyles: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 6,
  cursor: "default",
  outline: "none",
  userSelect: "none",
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "#f5f5f5",
  fontWeight: 400,
  fontSize: 14,
  transition: "background-color 0.15s ease, color 0.15s ease",
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}

const separatorStyles: React.CSSProperties = {
  height: 1,
  backgroundColor: "#2a2a2a",
  margin: "6px 0",
}

const contentStyles: React.CSSProperties = {
  backgroundColor: "#1a1a1a",
  color: "#f5f5f5",
  borderRadius: 8,
  boxShadow:
    "0px 12px 48px -12px rgba(0, 0, 0, 0.5), 0px 8px 24px -8px rgba(0, 0, 0, 0.3)",
  border: "1px solid #333333",
  padding: "6px",
  minWidth: 240,
  zIndex: 10001,
  fontSize: 14,
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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
                ? "#2a2a2a"
                : "transparent",
          }}
          onMouseEnter={() => setHoveredItem("appearance")}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <span
            style={{
              width: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          />
          <span style={{ flex: 1 }}>Appearance</span>
          <div style={{ marginLeft: "auto" }}>
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
                  hoveredItem === "boardBody" ? "#2a2a2a" : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                toggleLayer("boardBody")
              }}
              onMouseEnter={() => setHoveredItem("boardBody")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span
                style={{
                  width: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {visibility.boardBody && <CheckIcon />}
              </span>
              Board Body
            </DropdownMenu.Item>

            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "topCopper" ? "#2a2a2a" : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                toggleLayer("topCopper")
              }}
              onMouseEnter={() => setHoveredItem("topCopper")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span
                style={{
                  width: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {visibility.topCopper && <CheckIcon />}
              </span>
              Top Copper
            </DropdownMenu.Item>

            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "bottomCopper" ? "#2a2a2a" : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                toggleLayer("bottomCopper")
              }}
              onMouseEnter={() => setHoveredItem("bottomCopper")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span
                style={{
                  width: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {visibility.bottomCopper && <CheckIcon />}
              </span>
              Bottom Copper
            </DropdownMenu.Item>

            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "topSilkscreen" ? "#2a2a2a" : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                toggleLayer("topSilkscreen")
              }}
              onMouseEnter={() => setHoveredItem("topSilkscreen")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span
                style={{
                  width: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {visibility.topSilkscreen && <CheckIcon />}
              </span>
              Top Silkscreen
            </DropdownMenu.Item>

            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "bottomSilkscreen"
                    ? "#2a2a2a"
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
              <span
                style={{
                  width: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {visibility.bottomSilkscreen && <CheckIcon />}
              </span>
              Bottom Silkscreen
            </DropdownMenu.Item>

            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "smtModels" ? "#2a2a2a" : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                toggleLayer("smtModels")
              }}
              onMouseEnter={() => setHoveredItem("smtModels")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span
                style={{
                  width: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {visibility.smtModels && <CheckIcon />}
              </span>
              CAD Models
            </DropdownMenu.Item>
          </DropdownMenu.SubContent>
        </DropdownMenu.Portal>
      </DropdownMenu.Sub>
    </>
  )
}
