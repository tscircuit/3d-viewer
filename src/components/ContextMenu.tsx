import type React from "react"
import { useState, useCallback } from "react"
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
  "Top-Down",
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
  const [activeSubmenu, setActiveSubmenu] = useState<"camera" | null>(null)

  const handleMenuItemHover = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, hovered: boolean) => {
      event.currentTarget.style.background = hovered ? "#2d313a" : "transparent"
    },
    [],
  )

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: menuPos.y,
        left: menuPos.x,
        background: "#23272f",
        color: "#f5f6fa",
        borderRadius: 6,
        boxShadow: "0 6px 24px 0 rgba(0,0,0,0.18)",
        zIndex: 1000,
        minWidth: 200,
        border: "1px solid #353945",
        padding: 0,
        fontSize: 15,
        fontWeight: 500,
        transition: "opacity 0.1s",
      }}
    >
      <div
        style={{
          padding: "12px 18px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "#f5f6fa",
          fontWeight: 500,
          borderRadius: 6,
          transition: "background 0.1s",
        }}
        onClick={() =>
          onEngineSwitch(engine === "jscad" ? "manifold" : "jscad")
        }
        onMouseOver={(event) => handleMenuItemHover(event, true)}
        onMouseOut={(event) => handleMenuItemHover(event, false)}
      >
        Switch to {engine === "jscad" ? "Manifold" : "JSCAD"} Engine
        <span
          style={{
            fontSize: 12,
            marginLeft: "auto",
            opacity: 0.5,
            fontWeight: 400,
          }}
        >
          {engine === "jscad" ? "experimental" : "default"}
        </span>
      </div>
      <div
        style={{ position: "relative" }}
        onMouseEnter={() => setActiveSubmenu("camera")}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <div
          style={{
            padding: "10px 18px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "#f5f6fa",
            fontWeight: 500,
            borderRadius: 6,
            transition: "background 0.1s",
            background: activeSubmenu === "camera" ? "#2d313a" : "transparent",
          }}
          onClick={() =>
            setActiveSubmenu((current) =>
              current === "camera" ? null : "camera",
            )
          }
        >
          Camera Position
          <span style={{ marginLeft: "auto", opacity: 0.75 }}>
            {cameraPreset}
          </span>
          <span style={{ marginLeft: 4, opacity: 0.5 }}>›</span>
        </div>
        {activeSubmenu === "camera" && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "100%",
              marginLeft: 4,
              background: "#23272f",
              color: "#f5f6fa",
              borderRadius: 6,
              boxShadow: "0 6px 24px 0 rgba(0,0,0,0.18)",
              border: "1px solid #353945",
              minWidth: 200,
              padding: "6px 0",
              zIndex: 1001,
            }}
          >
            {cameraOptions.map((option) => (
              <div
                key={option}
                style={{
                  padding: "10px 18px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  color: "#f5f6fa",
                  fontWeight: 500,
                  borderRadius: 6,
                  transition: "background 0.1s",
                }}
                onClick={() => onCameraPresetSelect(option)}
                onMouseOver={(event) => handleMenuItemHover(event, true)}
                onMouseOut={(event) => handleMenuItemHover(event, false)}
              >
                <span style={{ width: 18 }}>
                  {cameraPreset === option ? "✔" : ""}
                </span>
                {option}
              </div>
            ))}
          </div>
        )}
      </div>
      <div
        style={{
          padding: "12px 18px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "#f5f6fa",
          fontWeight: 500,
          borderRadius: 6,
          transition: "background 0.1s",
        }}
        onClick={onAutoRotateToggle}
        onMouseOver={(event) => handleMenuItemHover(event, true)}
        onMouseOut={(event) => handleMenuItemHover(event, false)}
      >
        <span style={{ marginRight: 8 }}>{autoRotate ? "✔" : ""}</span>
        Auto rotate
      </div>
      <div
        style={{
          padding: "12px 18px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "#f5f6fa",
          fontWeight: 500,
          borderRadius: 6,
          transition: "background 0.1s",
        }}
        onClick={onDownloadGltf}
        onMouseOver={(event) => handleMenuItemHover(event, true)}
        onMouseOut={(event) => handleMenuItemHover(event, false)}
      >
        Download GLTF
      </div>
      <AppearanceMenu />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "8px 0",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          marginTop: "8px",
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
    </div>
  )
}
