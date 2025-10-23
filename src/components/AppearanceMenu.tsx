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
  transition: "background-color 0.1s ease",
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}

const separatorStyles: React.CSSProperties = {
  height: 1,
  backgroundColor: "#404040",
  margin: "4px 0",
}

const contentStyles: React.CSSProperties = {
  backgroundColor: "#262626",
  color: "#fafafa",
  borderRadius: 6,
  boxShadow:
    "0px 10px 38px -10px rgba(0, 0, 0, 0.35), 0px 10px 20px -15px rgba(0, 0, 0, 0.2)",
  border: "1px solid #404040",
  padding: "6px",
  minWidth: 220,
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
                ? "#404040"
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
            }}
          />
          <span>Appearance</span>
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
              <span
                style={{
                  width: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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
              <span
                style={{
                  width: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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
              <span
                style={{
                  width: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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
              <span
                style={{
                  width: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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
              <span
                style={{
                  width: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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
              <span
                style={{
                  width: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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
