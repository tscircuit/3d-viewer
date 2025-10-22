import type React from "react"
import { useRef } from "react"
import {
  ControlledMenu,
  MenuItem,
  SubMenu,
  MenuDivider,
  useMenuState,
} from "@szhsin/react-menu"
import { AppearanceMenu } from "./AppearanceMenu"
import type { CameraPreset } from "../hooks/useCameraController"
import packageJson from "../../package.json"
import "./context-menu.css"

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

// Custom styles for the menu
const menuStyles = {
  backgroundColor: "#1e1e1e",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "6px",
  padding: "5px",
  boxShadow:
    "0px 10px 38px -10px rgba(0, 0, 0, 0.35), 0px 10px 20px -15px rgba(0, 0, 0, 0.2)",
  minWidth: "220px",
}

const menuItemStyles = {
  color: "#f5f6fa",
  padding: "8px 12px",
  fontSize: "14px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  borderRadius: "4px",
  cursor: "pointer",
}

const menuItemHoverStyles = {
  backgroundColor: "#0078d4",
  color: "white",
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
  // Create a controlled menu that opens at specific position
  const anchorRef = useRef<HTMLDivElement>(null)

  return (
    <>
      {/* Hidden anchor element at cursor position */}
      <div
        ref={anchorRef}
        style={{
          position: "fixed",
          left: menuPos.x,
          top: menuPos.y,
          width: 1,
          height: 1,
          pointerEvents: "none",
        }}
      />

      <ControlledMenu
        ref={menuRef as any}
        state="open"
        anchorRef={anchorRef as any}
        onClose={() => {}}
        theming="dark"
        transition
        menuStyle={menuStyles}
        boundingBoxPadding="10"
        position="auto"
      >
        <MenuItem
          onClick={() =>
            onEngineSwitch(engine === "jscad" ? "manifold" : "jscad")
          }
        >
          <span>
            Switch to {engine === "jscad" ? "Manifold" : "JSCAD"} Engine
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: "12px",
              opacity: 0.6,
              color: "#a0a0a0",
            }}
          >
            {engine === "jscad" ? "experimental" : "default"}
          </span>
        </MenuItem>

        <SubMenu
          label={
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <span>Camera Position</span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "12px",
                  opacity: 0.6,
                  color: "#a0a0a0",
                }}
              >
                {cameraPreset}
              </span>
            </div>
          }
        >
          {cameraOptions.map((option) => (
            <MenuItem
              key={option}
              onClick={(e) => {
                e.keepOpen = true
                onCameraPresetSelect(option)
              }}
            >
              <span
                style={{
                  width: "20px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: "4px",
                }}
              >
                {cameraPreset === option ? "✔" : ""}
              </span>
              {option}
            </MenuItem>
          ))}
        </SubMenu>

        <MenuItem onClick={onAutoRotateToggle}>
          <span
            style={{
              width: "20px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "4px",
            }}
          >
            {autoRotate ? "✔" : ""}
          </span>
          Auto rotate
        </MenuItem>

        <MenuItem onClick={onDownloadGltf}>Download GLTF</MenuItem>

        <MenuDivider
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            margin: "5px 8px",
          }}
        />

        <AppearanceMenu />

        <MenuDivider
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            margin: "5px 8px",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "8px 12px 4px",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              opacity: 0.5,
              color: "#a0a0a0",
              fontWeight: 300,
            }}
          >
            @tscircuit/3d-viewer@{packageJson.version}
          </span>
        </div>
      </ControlledMenu>
    </>
  )
}
