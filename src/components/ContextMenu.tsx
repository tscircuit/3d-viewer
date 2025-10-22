import type React from "react"
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu"
import { AppearanceMenu } from "./AppearanceMenu"
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
  return (
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger asChild>
        {children}
      </ContextMenuPrimitive.Trigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content className="context-menu-content">
          <ContextMenuPrimitive.Item
            className="context-menu-item"
            onSelect={() =>
              onEngineSwitch(engine === "jscad" ? "manifold" : "jscad")
            }
          >
            <span>
              Switch to {engine === "jscad" ? "Manifold" : "JSCAD"} Engine
            </span>
            <span className="context-menu-hint">
              {engine === "jscad" ? "experimental" : "default"}
            </span>
          </ContextMenuPrimitive.Item>

          <ContextMenuPrimitive.Sub>
            <ContextMenuPrimitive.SubTrigger className="context-menu-item context-menu-submenu-trigger">
              <span>Camera Position</span>
              <span className="context-menu-hint">{cameraPreset}</span>
              <span className="context-menu-arrow">›</span>
            </ContextMenuPrimitive.SubTrigger>
            <ContextMenuPrimitive.Portal>
              <ContextMenuPrimitive.SubContent className="context-menu-content context-menu-subcontent">
                {cameraOptions.map((option) => (
                  <ContextMenuPrimitive.Item
                    key={option}
                    className="context-menu-item"
                    onSelect={() => onCameraPresetSelect(option)}
                  >
                    <span className="context-menu-checkmark">
                      {cameraPreset === option ? "✔" : ""}
                    </span>
                    {option}
                  </ContextMenuPrimitive.Item>
                ))}
              </ContextMenuPrimitive.SubContent>
            </ContextMenuPrimitive.Portal>
          </ContextMenuPrimitive.Sub>

          <ContextMenuPrimitive.CheckboxItem
            className="context-menu-item"
            checked={autoRotate}
            onCheckedChange={onAutoRotateToggle}
          >
            <span className="context-menu-checkmark">
              {autoRotate ? "✔" : ""}
            </span>
            Auto rotate
          </ContextMenuPrimitive.CheckboxItem>

          <ContextMenuPrimitive.Item
            className="context-menu-item"
            onSelect={onDownloadGltf}
          >
            Download GLTF
          </ContextMenuPrimitive.Item>

          <ContextMenuPrimitive.Separator className="context-menu-separator" />

          <AppearanceMenu />

          <ContextMenuPrimitive.Separator className="context-menu-separator" />

          <div className="context-menu-footer">
            <span className="context-menu-version">
              @tscircuit/3d-viewer@{packageJson.version}
            </span>
          </div>
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  )
}
