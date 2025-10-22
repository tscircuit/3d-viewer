import type React from "react"
import { useState, useCallback, useRef, useEffect } from "react"
import { CadViewerJscad } from "./CadViewerJscad"
import CadViewerManifold from "./CadViewerManifold"
import { useGlobalDownloadGltf } from "./hooks/useGlobalDownloadGltf"
import {
  LayerVisibilityProvider,
  useLayerVisibility,
} from "./contexts/LayerVisibilityContext"
import { ContextMenu } from "./components/ContextMenu"
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
  const { visibility, toggleLayer } = useLayerVisibility()

  const cameraControllerRef = useRef<CameraController | null>(null)
  const externalCameraControllerReady = props.onCameraControllerReady as
    | ((controller: CameraController | null) => void)
    | undefined

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

  const handleCameraPresetSelect = useCallback((preset: CameraPreset) => {
    setCameraPreset(preset)
    if (preset === "Custom") return
    cameraControllerRef.current?.animateToPreset(preset)
  }, [])

  useEffect(() => {
    const stored = window.localStorage.getItem("cadViewerEngine")
    if (stored === "jscad" || stored === "manifold") {
      setEngine(stored)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem("cadViewerEngine", engine)
  }, [engine])

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
      }}
    >
      <ContextMenu
        engine={engine}
        cameraPreset={cameraPreset}
        autoRotate={autoRotate}
        onEngineSwitch={(newEngine) => {
          setEngine(newEngine)
        }}
        onCameraPresetSelect={handleCameraPresetSelect}
        onAutoRotateToggle={toggleAutoRotate}
        onDownloadGltf={downloadGltf}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            userSelect: "none",
            MozUserSelect: "none",
            msUserSelect: "none",
            WebkitUserSelect: "none",
            WebkitTouchCallout: "none",
          }}
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
        </div>
      </ContextMenu>
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
