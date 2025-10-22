import { useLayerVisibility } from "../contexts/LayerVisibilityContext"
import type React from "react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"

const itemStyles: React.CSSProperties = {
  padding: "8px 18px",
  cursor: "default",
  outline: "none",
  userSelect: "none",
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "#f5f6fa",
  fontWeight: 400,
  fontSize: 14,
  transition: "background 0.1s",
}

const checkmarkStyle: React.CSSProperties = {
  width: 20,
}

const separatorStyles: React.CSSProperties = {
  height: 1,
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  margin: "8px 0",
}

const contentStyles: React.CSSProperties = {
  backgroundColor: "#23272f",
  color: "#f5f6fa",
  borderRadius: 6,
  boxShadow:
    "0px 10px 38px -10px rgba(0, 0, 0, 0.35), 0px 10px 20px -15px rgba(0, 0, 0, 0.2)",
  border: "1px solid #353945",
  padding: 0,
  minWidth: 200,
  zIndex: 10001,
  fontSize: 14,
}

export const AppearanceMenu = () => {
  const { visibility, toggleLayer } = useLayerVisibility()

  return (
    <>
      <DropdownMenu.Separator style={separatorStyles} />

      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger
          className="radix-dropdown-item radix-dropdown-sub-trigger"
          style={{ ...itemStyles, justifyContent: "space-between" }}
        >
          <span>Appearance</span>
          <span className="submenu-arrow">›</span>
        </DropdownMenu.SubTrigger>

        <DropdownMenu.Portal>
          <DropdownMenu.SubContent
            style={{ ...contentStyles, marginLeft: -2 }}
            collisionPadding={10}
            avoidCollisions={true}
          >
            <DropdownMenu.Item
              className="radix-dropdown-item"
              style={itemStyles}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                toggleLayer("boardBody")
              }}
            >
              <span style={checkmarkStyle}>
                {visibility.boardBody ? "✔" : ""}
              </span>
              Board Body
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className="radix-dropdown-item"
              style={itemStyles}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                toggleLayer("topCopper")
              }}
            >
              <span style={checkmarkStyle}>
                {visibility.topCopper ? "✔" : ""}
              </span>
              Top Copper
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className="radix-dropdown-item"
              style={itemStyles}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                toggleLayer("bottomCopper")
              }}
            >
              <span style={checkmarkStyle}>
                {visibility.bottomCopper ? "✔" : ""}
              </span>
              Bottom Copper
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className="radix-dropdown-item"
              style={itemStyles}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                toggleLayer("topSilkscreen")
              }}
            >
              <span style={checkmarkStyle}>
                {visibility.topSilkscreen ? "✔" : ""}
              </span>
              Top Silkscreen
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className="radix-dropdown-item"
              style={itemStyles}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                toggleLayer("bottomSilkscreen")
              }}
            >
              <span style={checkmarkStyle}>
                {visibility.bottomSilkscreen ? "✔" : ""}
              </span>
              Bottom Silkscreen
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className="radix-dropdown-item"
              style={itemStyles}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                toggleLayer("smtModels")
              }}
            >
              <span style={checkmarkStyle}>
                {visibility.smtModels ? "✔" : ""}
              </span>
              CAD Models
            </DropdownMenu.Item>
          </DropdownMenu.SubContent>
        </DropdownMenu.Portal>
      </DropdownMenu.Sub>
    </>
  )
}
