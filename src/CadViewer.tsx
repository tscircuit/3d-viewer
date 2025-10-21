import type React from "react"
import { useState, useCallback, useRef, useEffect } from "react"
import { CadViewerJscad } from "./CadViewerJscad"
import CadViewerManifold from "./CadViewerManifold"
import { useContextMenu } from "./hooks/useContextMenu"
import { useGlobalDownloadGltf } from "./hooks/useGlobalDownloadGltf"
import packageJson from "../package.json"
import {
  LayerVisibilityProvider,
  useLayerVisibility,
} from "./contexts/LayerVisibilityContext"
import { AppearanceMenu } from "./components/AppearanceMenu"
import type {
  CameraController,
  CameraPreset,
} from "./hooks/useCameraController"

const CadViewerInner = (props: any) => {
  const [engine, setEngine] = useState<"jscad" | "manifold">("manifold")
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [autoRotate, setAutoRotate] = useState(true)
  const [autoRotateUserToggled, setAutoRotateUserToggled] = useState(false)
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("Custom")
  const [activeSubmenu, setActiveSubmenu] = useState<"camera" | null>(null)
  const { visibility, toggleLayer } = useLayerVisibility()

  const cameraControllerRef = useRef<CameraController | null>(null)
  const externalCameraControllerReady = props.onCameraControllerReady as
    | ((controller: CameraController | null) => void)
    | undefined

  const {
    menuVisible,
    menuPos,
    menuRef,
    contextMenuEventHandlers,
    setMenuVisible,
  } = useContextMenu({ containerRef })

  const autoRotateUserToggledRef = useRef(autoRotateUserToggled)
  autoRotateUserToggledRef.current = autoRotateUserToggled

  const handleUserInteraction = useCallback(() => {
    if (!autoRotateUserToggledRef.current) {
      setAutoRotate(false)
    }
    setCameraPreset("Custom")
  }, [])

  const toggleAutoRotate = useCallback(() => {
    setAutoRotate((prev) => !prev)
    setAutoRotateUserToggled(true)
  }, [])

  const downloadGltf = useGlobalDownloadGltf()

  const closeMenu = useCallback(() => {
    setMenuVisible(false)
    setActiveSubmenu(null)
  }, [setMenuVisible, setActiveSubmenu])

  const handleMenuClick = (newEngine: "jscad" | "manifold") => {
    setEngine(newEngine)
    closeMenu()
  }

  const handleCameraControllerReady = useCallback(
    (controller: CameraController | null) => {
      cameraControllerRef.current = controller
      externalCameraControllerReady?.(controller)
      if (controller && cameraPreset !== "Custom") {
        controller.animateToPreset(cameraPreset)
      }
    },
    [cameraPreset, externalCameraControllerReady],
  )

  const handleCameraPresetSelect = useCallback(
    (preset: CameraPreset) => {
      setCameraPreset(preset)
      closeMenu()
      if (preset === "Custom") return
      cameraControllerRef.current?.animateToPreset(preset)
    },
    [closeMenu],
  )

  const handleMenuItemHover = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, hovered: boolean) => {
      event.currentTarget.style.background = hovered ? "#2d313a" : "transparent"
    },
    [],
  )

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

  useEffect(() => {
    const stored = window.localStorage.getItem("cadViewerEngine")
    if (stored === "jscad" || stored === "manifold") {
      setEngine(stored)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem("cadViewerEngine", engine)
  }, [engine])

  useEffect(() => {
    if (!menuVisible) {
      setActiveSubmenu(null)
    }
  }, [menuVisible])

  const viewerKey = props.circuitJson
    ? JSON.stringify(props.circuitJson)
    : undefined

  return (
    <div
      key={viewerKey}
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        userSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      }}
      {...contextMenuEventHandlers}
    >
      {engine === "jscad" ? (
        <CadViewerJscad
          {...props}
          autoRotateDisabled={props.autoRotateDisabled || !autoRotate}
          onUserInteraction={handleUserInteraction}
          onCameraControllerReady={handleCameraControllerReady}
        />
      ) : (
        <CadViewerManifold
          {...props}
          autoRotateDisabled={props.autoRotateDisabled || !autoRotate}
          onUserInteraction={handleUserInteraction}
          onCameraControllerReady={handleCameraControllerReady}
        />
      )}
      <div
        style={{
          position: "absolute",
          right: 8,
          top: 8,
          background: "#222",
          color: "#fff",
          padding: "2px 8px",
          borderRadius: 4,
          fontSize: 12,
          opacity: 0.7,
          userSelect: "none",
        }}
      >
        Engine: <b>{engine === "jscad" ? "JSCAD" : "Manifold"}</b>
      </div>
      {menuVisible && (
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
              handleMenuClick(engine === "jscad" ? "manifold" : "jscad")
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
                background:
                  activeSubmenu === "camera" ? "#2d313a" : "transparent",
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
                    onClick={() => handleCameraPresetSelect(option)}
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
            onClick={() => {
              toggleAutoRotate()
              closeMenu()
            }}
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
            onClick={() => {
              downloadGltf()
              closeMenu()
            }}
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
      )}
    </div>
  )
}

export const CadViewer = (props: any) => {
  return (
    <LayerVisibilityProvider>
      <CadViewerInner {...props} />
    </LayerVisibilityProvider>
  )
}
