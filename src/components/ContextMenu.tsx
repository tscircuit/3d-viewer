import type React from "react"
import { useState } from "react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { AppearanceMenu } from "./AppearanceMenu"
import type { CameraPreset } from "../hooks/useCameraController"
import packageJson from "../../package.json"
import { CheckIcon, ChevronRightIcon, DotIcon } from "./Icons"

interface ContextMenuProps {
  menuRef: React.RefObject<HTMLDivElement | null>
  menuPos: { x: number; y: number }
  engine: "jscad" | "manifold"
  cameraPreset: CameraPreset
  autoRotate: boolean
  onEngineSwitch: (engine: "jscad" | "manifold") => void
  onCameraPresetSelect: (preset: CameraPreset) => void
  onAutoRotateToggle: () => void
  onDownloadGltf: () => void
}

const cameraOptions: CameraPreset[] = [
  "Custom",
  "Top Centered",
  "Top Down",
  "Top Left Corner",
  "Top Right Corner",
  "Left Sideview",
  "Right Sideview",
  "Front",
]

const contentStyles: React.CSSProperties = {
  backgroundColor: "#262626",
  color: "#fafafa",
  borderRadius: 8,
  boxShadow:
    "0px 12px 48px -12px rgba(0, 0, 0, 0.5), 0px 8px 24px -8px rgba(0, 0, 0, 0.3)",
  border: "1px solid #333333",
  padding: "4px",
  minWidth: 160,
  zIndex: 10000,
  fontSize: 14,
  fontWeight: 400,
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}

const itemStyles: React.CSSProperties = {
  padding: "8px 8px",
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

const iconContainerStyles: React.CSSProperties = {
  width: 16,
  height: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
}

const separatorStyles: React.CSSProperties = {
  height: 1,
  backgroundColor: "#ffffff1a",
  margin: "4px 0",
}

const badgeStyles: React.CSSProperties = {
  fontSize: 11,
  opacity: 0.65,
  fontWeight: 500,
  color: "#b5b5bcff",
  backgroundColor: "rgba(161, 161, 170, 0.1)",
  padding: "2px 6px",
  borderRadius: 4,
  border: "1px solid rgba(161, 161, 170, 0.2)",
  letterSpacing: "0.3px",
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  menuRef,
  menuPos,
  engine,
  cameraPreset,
  autoRotate,
  onEngineSwitch,
  onCameraPresetSelect,
  onAutoRotateToggle,
  onDownloadGltf,
}) => {
  const [cameraSubOpen, setCameraSubOpen] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        left: menuPos.x,
        top: menuPos.y,
        width: 0,
        height: 0,
      }}
    >
      <DropdownMenu.Root open={true} modal={false}>
        <DropdownMenu.Trigger asChild>
          <div style={{ position: "absolute", width: 1, height: 1 }} />
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            style={contentStyles}
            collisionPadding={10}
            avoidCollisions={true}
            sideOffset={0}
            align="start"
          >
            {/* Camera Position Submenu */}
            <DropdownMenu.Sub onOpenChange={setCameraSubOpen}>
              <DropdownMenu.SubTrigger
                style={{
                  ...itemStyles,
                  backgroundColor:
                    cameraSubOpen || hoveredItem === "camera"
                      ? "#404040"
                      : "transparent",
                }}
                onMouseEnter={() => setHoveredItem("camera")}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <span style={iconContainerStyles} />
                <span style={{ flex: 1 }}>Camera Position</span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginLeft: "auto",
                  }}
                >
                  <span style={{ opacity: 0.55, fontSize: 13 }}>
                    {cameraPreset}
                  </span>
                  <ChevronRightIcon isOpen={cameraSubOpen} />
                </div>
              </DropdownMenu.SubTrigger>

              <DropdownMenu.Portal>
                <DropdownMenu.SubContent
                  style={{ ...contentStyles, marginLeft: -2 }}
                  collisionPadding={10}
                  avoidCollisions={true}
                >
                  {cameraOptions.map((option) => (
                    <DropdownMenu.Item
                      key={option}
                      style={{
                        ...itemStyles,
                        backgroundColor:
                          hoveredItem === option ? "#404040" : "transparent",
                      }}
                      onSelect={(e) => e.preventDefault()}
                      onPointerDown={(e) => {
                        e.preventDefault()
                        onCameraPresetSelect(option)
                      }}
                      onMouseEnter={() => setHoveredItem(option)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <span style={iconContainerStyles}>
                        {cameraPreset === option && <DotIcon />}
                      </span>
                      {option}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>

            {/* Auto Rotate */}
            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "autorotate" ? "#404040" : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                onAutoRotateToggle()
              }}
              onMouseEnter={() => setHoveredItem("autorotate")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span style={iconContainerStyles}>
                {autoRotate && <CheckIcon />}
              </span>
              Auto rotate
            </DropdownMenu.Item>

            {/* Appearance Menu */}
            <AppearanceMenu />

            <DropdownMenu.Separator style={separatorStyles} />

            {/* Download GLTF */}
            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "download" ? "#404040" : "transparent",
              }}
              onSelect={onDownloadGltf}
              onMouseEnter={() => setHoveredItem("download")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span style={iconContainerStyles} />
              Download GLTF
            </DropdownMenu.Item>

            <DropdownMenu.Separator style={separatorStyles} />

            {/* Engine Switch */}
            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "engine" ? "#404040" : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                onEngineSwitch(engine === "jscad" ? "manifold" : "jscad")
              }}
              onMouseEnter={() => setHoveredItem("engine")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span style={iconContainerStyles} />
              <span style={{ flex: 1 }}>
                Switch to {engine === "jscad" ? "Manifold" : "JSCAD"} Engine
              </span>
              <div style={badgeStyles}>
                {engine === "jscad" ? "experimental" : "default"}
              </div>
            </DropdownMenu.Item>

            <DropdownMenu.Separator style={separatorStyles} />

            {/* Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "4px 0 2px",
                marginTop: 0,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  opacity: 0.35,
                  fontWeight: 400,
                  color: "#a1a1aa",
                  letterSpacing: "0.2px",
                }}
              >
                @tscircuit/3d-viewer@{packageJson.version}
              </span>
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}
