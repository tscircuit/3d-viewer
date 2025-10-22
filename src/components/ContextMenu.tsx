import type React from "react"
import { useRef } from "react"
import {
  ControlledMenu,
  MenuItem,
  SubMenu,
  MenuDivider,
  useMenuState,
} from "@szhsin/react-menu"
import "@szhsin/react-menu/dist/index.css"
import "@szhsin/react-menu/dist/transitions/slide.css"
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
          <span className="menu-hint">
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
              <span className="menu-hint">{cameraPreset}</span>
            </div>
          }
        >
          {cameraOptions.map((option) => (
            <MenuItem key={option} onClick={() => onCameraPresetSelect(option)}>
              <span className="menu-checkmark">
                {cameraPreset === option ? "✔" : ""}
              </span>
              {option}
            </MenuItem>
          ))}
        </SubMenu>

        <MenuItem onClick={onAutoRotateToggle}>
          <span className="menu-checkmark">{autoRotate ? "✔" : ""}</span>
          Auto rotate
        </MenuItem>

        <MenuItem onClick={onDownloadGltf}>Download GLTF</MenuItem>

        <MenuDivider />

        <AppearanceMenu />

        <MenuDivider />

        <div className="context-menu-footer">
          <span className="context-menu-version">
            @tscircuit/3d-viewer@{packageJson.version}
          </span>
        </div>
      </ControlledMenu>
    </>
  )
}
