import type React from "react"
import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import * as THREE from "three"
import { CadViewerJscad } from "./CadViewerJscad"
import CadViewerManifold from "./CadViewerManifold"
import { useContextMenu } from "./hooks/useContextMenu"
import { useCameraPreset } from "./hooks/useCameraPreset"
import { useGlobalDownloadGltf } from "./hooks/useGlobalDownloadGltf"
import {
  useRegisteredHotkey,
  registerHotkeyViewer,
} from "./hooks/useRegisteredHotkey"
import {
  LayerVisibilityProvider,
  useLayerVisibility,
} from "./contexts/LayerVisibilityContext"
import {
  CameraControllerProvider,
  useCameraController,
} from "./contexts/CameraControllerContext"
import { ToastProvider, useToast } from "./contexts/ToastContext"
import { ContextMenu } from "./components/ContextMenu"
import { KeyboardShortcutsDialog } from "./components/KeyboardShortcutsDialog"
import type { CameraController, CameraPreset } from "./hooks/cameraAnimation"

const CadViewerInner = (props: any) => {
  const [engine, setEngine] = useState<"jscad" | "manifold">("manifold")
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isKeyboardShortcutsDialogOpen, setIsKeyboardShortcutsDialogOpen] =
    useState(false)
  const [autoRotate, setAutoRotate] = useState(() => {
    const stored = window.localStorage.getItem("cadViewerAutoRotate")
    return stored === "false" ? false : true
  })
  const [autoRotateUserToggled, setAutoRotateUserToggled] = useState(() => {
    const stored = window.localStorage.getItem("cadViewerAutoRotateUserToggled")
    return stored === "true"
  })
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("Custom")
  const { cameraType, setCameraType } = useCameraController()
  const { visibility, setLayerVisibility } = useLayerVisibility()
  const { showToast } = useToast()

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

  const isAnimatingRef = useRef(false)
  const lastPresetSelectTime = useRef(0)
  const PRESET_COOLDOWN = 1000 // 1 second cooldown after selecting a preset

  const handleUserInteraction = useCallback(() => {
    // Don't update if we're in the middle of an animation or just selected a preset
    if (
      isAnimatingRef.current ||
      Date.now() - lastPresetSelectTime.current < PRESET_COOLDOWN
    ) {
      return
    }

    if (!autoRotateUserToggledRef.current) {
      setAutoRotate(false)
    }

    // Only set to Custom if the user is actually interacting with the camera
    // and not just clicking on the preset menu
    if (!menuVisible) {
      setCameraPreset("Custom")
    }
  }, [menuVisible])

  const toggleAutoRotate = useCallback(() => {
    setAutoRotate((prev) => !prev)
    setAutoRotateUserToggled(true)
  }, [])

  const downloadGltf = useGlobalDownloadGltf()

  const closeMenu = useCallback(() => {
    setMenuVisible(false)
  }, [setMenuVisible])

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

  const { handleCameraPresetSelect } = useCameraPreset({
    setAutoRotate,
    setAutoRotateUserToggled,
    setCameraPreset,
    closeMenu,
    cameraControllerRef,
    isAnimatingRef,
    lastPresetSelectTime,
  })

  useRegisteredHotkey(
    "open_keyboard_shortcuts_dialog",
    () => {
      setIsKeyboardShortcutsDialogOpen(true)
    },
    {
      shortcut: "shift+?",
      description: "Open keyboard shortcuts",
    },
  )

  useRegisteredHotkey(
    "toggle_smt_models",
    () => {
      const newVisibility = !visibility.smtModels
      setLayerVisibility("smtModels", newVisibility)
      showToast(
        newVisibility ? "SMT components visible" : "SMT components hidden",
        1500,
      )
    },
    {
      shortcut: "shift+s",
      description: "Toggle surface mount components",
    },
  )

  useRegisteredHotkey(
    "toggle_through_hole_models",
    () => {
      const newVisibility = !visibility.throughHoleModels
      setLayerVisibility("throughHoleModels", newVisibility)
      showToast(
        newVisibility
          ? "Through-hole components visible"
          : "Through-hole components hidden",
        1500,
      )
    },
    {
      shortcut: "shift+t",
      description: "Toggle through-hole components",
    },
  )

  // Register the viewer element for hotkey bounds checking
  useEffect(() => {
    if (containerRef.current) {
      registerHotkeyViewer(containerRef.current)
    }
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

  useEffect(() => {
    window.localStorage.setItem("cadViewerAutoRotate", String(autoRotate))
  }, [autoRotate])

  useEffect(() => {
    window.localStorage.setItem(
      "cadViewerAutoRotateUserToggled",
      String(autoRotateUserToggled),
    )
  }, [autoRotateUserToggled])

  // Initialize camera type from localStorage
  useEffect(() => {
    const stored = window.localStorage.getItem("cadViewerCameraType")
    if (stored === "orthographic" || stored === "perspective") {
      setCameraType(stored)
    }
  }, [setCameraType])

  // Sync camera type to localStorage
  useEffect(() => {
    window.localStorage.setItem("cadViewerCameraType", cameraType)
  }, [cameraType])

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
          cameraType={cameraType}
          onUserInteraction={handleUserInteraction}
          onCameraControllerReady={handleCameraControllerReady}
        />
      ) : (
        <CadViewerManifold
          {...props}
          autoRotateDisabled={props.autoRotateDisabled || !autoRotate}
          cameraType={cameraType}
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
        <ContextMenu
          menuRef={menuRef}
          menuPos={menuPos}
          engine={engine}
          cameraPreset={cameraPreset}
          autoRotate={autoRotate}
          onEngineSwitch={(newEngine) => {
            setEngine(newEngine)
            closeMenu()
          }}
          onCameraPresetSelect={handleCameraPresetSelect}
          onAutoRotateToggle={() => {
            toggleAutoRotate()
            closeMenu()
          }}
          onDownloadGltf={() => {
            downloadGltf()
            closeMenu()
          }}
          onOpenKeyboardShortcuts={() => {
            setIsKeyboardShortcutsDialogOpen(true)
            closeMenu()
          }}
        />
      )}
      <KeyboardShortcutsDialog
        open={isKeyboardShortcutsDialogOpen}
        onClose={() => setIsKeyboardShortcutsDialogOpen(false)}
      />
    </div>
  )
}

export const CadViewer = (props: any) => {
  // Default camera target and position - these will be overridden by CadViewerContainer
  const defaultTarget = useMemo(() => new THREE.Vector3(0, 0, 0), [])
  const initialCameraPosition = useMemo<readonly [number, number, number]>(
    () => [5, -5, 5] as const,
    [],
  )

  return (
    <CameraControllerProvider
      defaultTarget={defaultTarget}
      initialCameraPosition={initialCameraPosition}
    >
      <LayerVisibilityProvider>
        <ToastProvider>
          <CadViewerInner {...props} />
        </ToastProvider>
      </LayerVisibilityProvider>
    </CameraControllerProvider>
  )
}
