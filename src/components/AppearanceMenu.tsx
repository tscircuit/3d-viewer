import { useState } from "react"
import { useLayerVisibility } from "../contexts/LayerVisibilityContext"
import { useFauxBoard } from "../contexts/FauxBoardContext"
import type React from "react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { CheckIcon, ChevronRightIcon } from "./Icons"
import { zIndexMap } from "../../lib/utils/z-index-map"

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

const itemPaddingStyles: React.CSSProperties = {
  paddingLeft: 32,
  paddingTop: 6,
  paddingBottom: 6,
  paddingRight: 8,
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
  zIndex: zIndexMap.appearanceMenu,
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
  const { visibility, setLayerVisibility } = useLayerVisibility()
  const { isFauxBoard } = useFauxBoard()
  const [appearanceSubOpen, setAppearanceSubOpen] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  return (
    <>
      <DropdownMenu.Separator style={separatorStyles} />

      <DropdownMenu.Sub onOpenChange={setAppearanceSubOpen}>
        <DropdownMenu.SubTrigger
          style={{
            ...itemStyles,
            ...itemPaddingStyles,
            backgroundColor:
              appearanceSubOpen || hoveredItem === "appearance"
                ? "#404040"
                : "transparent",
          }}
          onMouseEnter={() => setHoveredItem("appearance")}
          onMouseLeave={() => setHoveredItem(null)}
          onTouchStart={() => setHoveredItem("appearance")}
        >
          <span style={{ flex: 1, display: "flex", alignItems: "center" }}>
            Appearance
          </span>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "flex-end",
              marginBottom: "-5px",
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
                setLayerVisibility("boardBody", !visibility.boardBody)
              }}
              onMouseEnter={() => setHoveredItem("boardBody")}
              onMouseLeave={() => setHoveredItem(null)}
              onTouchStart={() => setHoveredItem("boardBody")}
            >
              <span style={iconContainerStyles}>
                {visibility.boardBody && <CheckIcon />}
              </span>
              <span style={{ display: "flex", alignItems: "center" }}>
                Board Body
              </span>
            </DropdownMenu.Item>

            {isFauxBoard && (
              <DropdownMenu.Item
                style={{
                  ...itemStyles,
                  backgroundColor:
                    hoveredItem === "fauxBoard" ? "#404040" : "transparent",
                }}
                onSelect={(e) => e.preventDefault()}
                onPointerDown={(e) => {
                  e.preventDefault()
                  setLayerVisibility("fauxBoard", !visibility.fauxBoard)
                }}
                onMouseEnter={() => setHoveredItem("fauxBoard")}
                onMouseLeave={() => setHoveredItem(null)}
                onTouchStart={() => setHoveredItem("fauxBoard")}
              >
                <span style={iconContainerStyles}>
                  {visibility.fauxBoard && <CheckIcon />}
                </span>
                <span style={{ display: "flex", alignItems: "center" }}>
                  Faux Board
                </span>
              </DropdownMenu.Item>
            )}

            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "topCopper" ? "#404040" : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                setLayerVisibility("topCopper", !visibility.topCopper)
              }}
              onMouseEnter={() => setHoveredItem("topCopper")}
              onMouseLeave={() => setHoveredItem(null)}
              onTouchStart={() => setHoveredItem("topCopper")}
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
                setLayerVisibility("bottomCopper", !visibility.bottomCopper)
              }}
              onMouseEnter={() => setHoveredItem("bottomCopper")}
              onMouseLeave={() => setHoveredItem(null)}
              onTouchStart={() => setHoveredItem("bottomCopper")}
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
                setLayerVisibility("topSilkscreen", !visibility.topSilkscreen)
              }}
              onMouseEnter={() => setHoveredItem("topSilkscreen")}
              onMouseLeave={() => setHoveredItem(null)}
              onTouchStart={() => setHoveredItem("topSilkscreen")}
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
                setLayerVisibility(
                  "bottomSilkscreen",
                  !visibility.bottomSilkscreen,
                )
              }}
              onMouseEnter={() => setHoveredItem("bottomSilkscreen")}
              onMouseLeave={() => setHoveredItem(null)}
              onTouchStart={() => setHoveredItem("bottomSilkscreen")}
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
                setLayerVisibility("smtModels", !visibility.smtModels)
              }}
              onMouseEnter={() => setHoveredItem("smtModels")}
              onMouseLeave={() => setHoveredItem(null)}
              onTouchStart={() => setHoveredItem("smtModels")}
            >
              <span style={iconContainerStyles}>
                {visibility.smtModels && <CheckIcon />}
              </span>
              <span style={{ display: "flex", alignItems: "center" }}>
                Surface Mount Components
              </span>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "throughHoleModels"
                    ? "#404040"
                    : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                setLayerVisibility(
                  "throughHoleModels",
                  !visibility.throughHoleModels,
                )
              }}
              onMouseEnter={() => setHoveredItem("throughHoleModels")}
              onMouseLeave={() => setHoveredItem(null)}
              onTouchStart={() => setHoveredItem("throughHoleModels")}
            >
              <span style={iconContainerStyles}>
                {visibility.throughHoleModels && <CheckIcon />}
              </span>
              <span style={{ display: "flex", alignItems: "center" }}>
                Through-Hole Components
              </span>
            </DropdownMenu.Item>
          </DropdownMenu.SubContent>
        </DropdownMenu.Portal>
      </DropdownMenu.Sub>
    </>
  )
}
