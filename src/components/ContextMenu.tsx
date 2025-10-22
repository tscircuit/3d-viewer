import type React from "react"
import { useState } from "react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { AppearanceMenu } from "./AppearanceMenu"
import type { CameraPreset } from "../hooks/useCameraController"
import packageJson from "../../package.json"

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

// Inline styles
const contentStyles: React.CSSProperties = {
  backgroundColor: "#1e1e1e",
  color: "#e4e4e7",
  borderRadius: 8,
  boxShadow:
    "0px 10px 40px -10px rgba(0, 0, 0, 0.5), 0px 0px 0px 1px rgba(255, 255, 255, 0.08)",
  border: "none",
  padding: "6px",
  minWidth: 220,
  zIndex: 10000,
  fontSize: 14,
  fontWeight: 400,
}

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
  transition: "background-color 0.12s ease",
}

const separatorStyles: React.CSSProperties = {
  height: 1,
  backgroundColor: "rgba(255, 255, 255, 0.08)",
  margin: "6px 0",
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
            {/* Engine Switch */}
            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "engine"
                    ? "rgba(255, 255, 255, 0.1)"
                    : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                onEngineSwitch(engine === "jscad" ? "manifold" : "jscad")
              }}
              onMouseEnter={() => setHoveredItem("engine")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span>
                Switch to {engine === "jscad" ? "Manifold" : "JSCAD"} Engine
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 12,
                  opacity: 0.5,
                  fontWeight: 400,
                }}
              >
                {engine === "jscad" ? "experimental" : "default"}
              </span>
            </DropdownMenu.Item>

            {/* Camera Position Submenu */}
            <DropdownMenu.Sub onOpenChange={setCameraSubOpen}>
              <DropdownMenu.SubTrigger
                style={{
                  ...itemStyles,
                  backgroundColor:
                    cameraSubOpen || hoveredItem === "camera"
                      ? "rgba(255, 255, 255, 0.1)"
                      : "transparent",
                }}
                onMouseEnter={() => setHoveredItem("camera")}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <span>Camera Position</span>
                <span
                  style={{
                    marginLeft: "auto",
                    opacity: 0.5,
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {cameraPreset}
                  <span
                    style={{
                      display: "inline-block",
                      transition: "transform 0.2s ease",
                      opacity: 0.7,
                      transform: cameraSubOpen
                        ? "rotate(90deg)"
                        : "rotate(0deg)",
                    }}
                  >
                    ›
                  </span>
                </span>
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
                          hoveredItem === option
                            ? "rgba(255, 255, 255, 0.1)"
                            : "transparent",
                      }}
                      onSelect={(e) => e.preventDefault()}
                      onPointerDown={(e) => {
                        e.preventDefault()
                        onCameraPresetSelect(option)
                      }}
                      onMouseEnter={() => setHoveredItem(option)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <span style={{ width: 16, fontSize: 14 }}>
                        {cameraPreset === option ? "✓" : ""}
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
                  hoveredItem === "autorotate"
                    ? "rgba(255, 255, 255, 0.1)"
                    : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                onAutoRotateToggle()
              }}
              onMouseEnter={() => setHoveredItem("autorotate")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span style={{ width: 16, fontSize: 14 }}>
                {autoRotate ? "✓" : ""}
              </span>
              Auto rotate
            </DropdownMenu.Item>

            {/* Download GLTF */}
            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "download"
                    ? "rgba(255, 255, 255, 0.1)"
                    : "transparent",
              }}
              onSelect={onDownloadGltf}
              onMouseEnter={() => setHoveredItem("download")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              Download GLTF
            </DropdownMenu.Item>

            {/* Appearance Menu */}
            <AppearanceMenu />

            <DropdownMenu.Separator style={separatorStyles} />

            {/* Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "6px 0 4px",
                marginTop: 2,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  opacity: 0.4,
                  fontWeight: 400,
                  color: "#a1a1aa",
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
