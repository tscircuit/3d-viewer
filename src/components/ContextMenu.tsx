import type React from "react"
import { useEffect } from "react"
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
  backgroundColor: "#23272f",
  color: "#f5f6fa",
  borderRadius: 6,
  boxShadow:
    "0px 10px 38px -10px rgba(0, 0, 0, 0.35), 0px 10px 20px -15px rgba(0, 0, 0, 0.2)",
  border: "1px solid #353945",
  padding: 0,
  minWidth: 200,
  zIndex: 10000,
  fontSize: 15,
  fontWeight: 500,
}

const itemStyles: React.CSSProperties = {
  padding: "12px 18px",
  borderRadius: 6,
  cursor: "default",
  outline: "none",
  userSelect: "none",
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "#f5f6fa",
  fontWeight: 500,
  transition: "background 0.1s",
}

const separatorStyles: React.CSSProperties = {
  height: 1,
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  margin: "8px 0",
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
  // Inject styles for hover effects and arrow animations
  useEffect(() => {
    const styleId = "radix-dropdown-menu-styles"
    if (document.getElementById(styleId)) return

    const style = document.createElement("style")
    style.id = styleId
    style.textContent = `
      .radix-dropdown-item[data-highlighted] {
        background-color: #2d313a !important;
        color: #f5f6fa;
      }
      .radix-dropdown-sub-trigger[data-state="open"] {
        background-color: #2d313a !important;
      }
      .submenu-arrow {
        display: inline-block;
        transition: transform 0.2s ease;
        margin-left: 4px;
        opacity: 0.5;
      }
      .radix-dropdown-sub-trigger[data-state="open"] .submenu-arrow {
        transform: rotate(90deg);
      }
    `
    document.head.appendChild(style)
    return () => {
      const el = document.getElementById(styleId)
      if (el) document.head.removeChild(el)
    }
  }, [])

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
              className="radix-dropdown-item"
              style={itemStyles}
              onSelect={() =>
                onEngineSwitch(engine === "jscad" ? "manifold" : "jscad")
              }
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
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger
                className="radix-dropdown-item radix-dropdown-sub-trigger"
                style={{ ...itemStyles, padding: "10px 18px" }}
              >
                <span>Camera Position</span>
                <span
                  style={{ marginLeft: "auto", opacity: 0.75, fontSize: 12 }}
                >
                  {cameraPreset}
                </span>
                <span className="submenu-arrow">›</span>
              </DropdownMenu.SubTrigger>

              <DropdownMenu.Portal>
                <DropdownMenu.SubContent
                  style={{ ...contentStyles, padding: "6px 0", marginLeft: -2 }}
                  collisionPadding={10}
                  avoidCollisions={true}
                >
                  {cameraOptions.map((option) => (
                    <DropdownMenu.Item
                      key={option}
                      className="radix-dropdown-item"
                      style={{ ...itemStyles, padding: "10px 18px" }}
                      onSelect={(e) => e.preventDefault()}
                      onPointerDown={(e) => {
                        e.preventDefault()
                        onCameraPresetSelect(option)
                      }}
                    >
                      <span style={{ width: 18 }}>
                        {cameraPreset === option ? "✔" : ""}
                      </span>
                      {option}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>

            {/* Auto Rotate */}
            <DropdownMenu.Item
              className="radix-dropdown-item"
              style={itemStyles}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                onAutoRotateToggle()
              }}
            >
              <span style={{ marginRight: 8 }}>{autoRotate ? "✔" : ""}</span>
              Auto rotate
            </DropdownMenu.Item>

            {/* Download GLTF */}
            <DropdownMenu.Item
              className="radix-dropdown-item"
              style={itemStyles}
              onSelect={onDownloadGltf}
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
                padding: "8px 0",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  opacity: 0.6,
                  fontWeight: 300,
                  color: "#c0c0c0",
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
