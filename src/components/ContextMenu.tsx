import type React from "react"
import { useRef } from "react"
import {
  Menu,
  MenuItem,
  SubMenu,
  MenuDivider,
  ControlledMenu,
  useMenuState,
} from "@szhsin/react-menu"
import "@szhsin/react-menu/dist/index.css"
import "@szhsin/react-menu/dist/transitions/slide.css"
import { AppearanceMenuItems } from "./AppearanceMenu"
import type { CameraPreset } from "../hooks/useCameraController"
import packageJson from "../../package.json"
import "./context-menu.css"

interface ContextMenuProps {
  children: React.ReactNode
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
  children,
  engine,
  cameraPreset,
  autoRotate,
  onEngineSwitch,
  onCameraPresetSelect,
  onAutoRotateToggle,
  onDownloadGltf,
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [menuState, toggleMenu] = useMenuState()

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    toggleMenu(true)
  }

  return (
    <div
      ref={ref}
      onContextMenu={handleContextMenu}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      {children}

      <ControlledMenu
        {...menuState}
        anchorRef={ref as any}
        onClose={() => toggleMenu(false)}
        theming="dark"
        transition
        boundingBoxPadding="10"
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

        <AppearanceMenuItems />

        <MenuDivider />

        <div className="context-menu-footer">
          <span className="context-menu-version">
            @tscircuit/3d-viewer@{packageJson.version}
          </span>
        </div>
      </ControlledMenu>
    </div>
  )
}
