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
  saveCameraPresetToSession,
  loadCameraPresetFromSession,
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
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>(() => {
    const stored = loadCameraPresetFromSession()
    return stored ?? "Custom"
  })
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
  const isRestoringCameraRef = useRef(false)
  const PRESET_COOLDOWN = 1500 // 1.5 second cooldown after selecting a preset

  const handleUserInteraction = useCallback(() => {
    // Don't update if we're in the middle of an animation, restoring camera, or just selected a preset
    if (
      isAnimatingRef.current ||
      isRestoringCameraRef.current ||
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
      // If a named preset is stored, apply it after a short delay to override
      // any conflicting camera session restoration
      if (controller && cameraPreset !== "Custom") {
        isRestoringCameraRef.current = true
        lastPresetSelectTime.current = Date.now()
        setTimeout(() => {
          controller.animateToPreset(cameraPreset)
          // Keep the restoring flag true for a bit longer to prevent premature reset
          setTimeout(() => {
            isRestoringCameraRef.current = false
          }, 1000)
        }, 50)
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

  useRegisteredHotkey(
    "toggle_translucent_models",
    () => {
      const newVisibility = !visibility.translucentModels
      setLayerVisibility("translucentModels", newVisibility)
      showToast(
        newVisibility
          ? "Translucent components visible"
          : "Translucent components hidden",
        1500,
      )
    },
    {
      shortcut: "shift+v",
      description: "Toggle translucent components",
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

  const viewerKey = props.circuitJson
    ? JSON.stringify(props.circuitJson)
    : undefined

  // Initialize camera type from localStorage
  useEffect(() => {
    const stored = window.localStorage.getItem("cadViewerCameraType")
    if (stored === "orthographic" || stored === "perspective") {
      setCameraType(stored)
    }
  }, [setCameraType])

  // Persist camera preset to session storage
  useEffect(() => {
    saveCameraPresetToSession(cameraPreset)
  }, [cameraPreset])

  // Re-read camera preset from session when viewerKey changes (file switch)
useEffect(() => {
  const stored = loadCameraPresetFromSession()
  if (stored) {
    // Set flag to prevent handleUserInteraction from resetting to Custom
    isRestoringCameraRef.current = true
    lastPresetSelectTime.current = Date.now()
    setCameraPreset(stored)
    // Keep the restoring flag true for a bit to prevent premature reset
    const timeout = setTimeout(() => {
      isRestoringCameraRef.current = false
    }, 2000)
    return () => clearTimeout(timeout)
  }
}, [viewerKey])

  // Sync camera type to localStorage
  useEffect(() => {
    window.localStorage.setItem("cadViewerCameraType", cameraType)
  }, [cameraType])

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
