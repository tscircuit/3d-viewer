import type React from "react"
import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import * as THREE from "three"
import { CadViewerJscad } from "./CadViewerJscad"
import CadViewerManifold from "./CadViewerManifold"
import { useContextMenu } from "./hooks/useContextMenu"
import { useCameraPreset } from "./hooks/useCameraPreset"
import { useGlobalDownloadGltf } from "./hooks/useGlobalDownloadGltf"
import {
  LayerVisibilityProvider,
  useLayerVisibility,
} from "./contexts/LayerVisibilityContext"
import {
  CameraControllerProvider,
  useCameraController,
} from "./contexts/CameraControllerContext"
import { ContextMenu } from "./components/ContextMenu"
import type { CameraController, CameraPreset } from "./hooks/cameraAnimation"
import { KeyboardShortcutsDialog } from "./components/KeyboardShortcutsDialog"
import { useRegisteredHotkey } from "./hooks/useRegisteredHotkey"
import {
  getComponentTypeLabel,
  type ComponentType,
} from "./utils/component-type"

const CadViewerInner = (props: any) => {
  const [engine, setEngine] = useState<"jscad" | "manifold">("manifold")
  const containerRef = useRef<HTMLDivElement | null>(null)
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
  const { visibility, toggleLayer } = useLayerVisibility()
  const [isShortcutsDialogOpen, setIsShortcutsDialogOpen] = useState(false)
  const [visibilityToast, setVisibilityToast] = useState<string | null>(null)
  const visibilityToastTimeoutRef = useRef<number | null>(null)
  const toastBottom = 32 //px

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

  const showVisibilityFeedback = useCallback(
    (componentType: ComponentType, isVisible: boolean) => {
      if (visibilityToastTimeoutRef.current) {
        window.clearTimeout(visibilityToastTimeoutRef.current)
      }
      const label = getComponentTypeLabel(componentType)
      setVisibilityToast(`${label} ${isVisible ? "visible" : "hidden"}`)
      visibilityToastTimeoutRef.current = window.setTimeout(() => {
        setVisibilityToast(null)
      }, 2000)
    },
    [],
  )

  useEffect(() => {
    return () => {
      if (visibilityToastTimeoutRef.current) {
        window.clearTimeout(visibilityToastTimeoutRef.current)
      }
    }
  }, [])

  const createToggleVisibility = useCallback(
    (layerKey: keyof typeof visibility, componentType: ComponentType) => {
      return () => {
        const nextVisible = !visibility[layerKey]
        toggleLayer(layerKey)
        showVisibilityFeedback(componentType, nextVisible)
      }
    },
    [toggleLayer, visibility, showVisibilityFeedback],
  )

  const toggleSmdVisibility = useMemo(
    () => createToggleVisibility("smtModels", "smd"),
    [createToggleVisibility],
  )

  const toggleThroughHoleVisibility = useMemo(
    () => createToggleVisibility("throughHoleModels", "through_hole"),
    [createToggleVisibility],
  )

  const toggleVirtualVisibility = useMemo(
    () => createToggleVisibility("virtualModels", "virtual"),
    [createToggleVisibility],
  )

  useRegisteredHotkey("toggle_smd_components", toggleSmdVisibility, {
    key: "s",
    description: "Toggle SMD components",
    category: "3D Viewer",
  })

  useRegisteredHotkey(
    "toggle_through_hole_components",
    toggleThroughHoleVisibility,
    {
      key: "t",
      description: "Toggle through-hole components",
      category: "3D Viewer",
    },
  )

  useRegisteredHotkey("toggle_virtual_components", toggleVirtualVisibility, {
    key: "v",
    description: "Toggle virtual components",
    category: "3D Viewer",
  })

  useRegisteredHotkey(
    "open_keyboard_shortcuts_dialog",
    () => setIsShortcutsDialogOpen(true),
    {
      key: "?",
      description: "Show keyboard shortcuts",
      category: "General",
    },
  )

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
            setIsShortcutsDialogOpen(true)
            closeMenu()
          }}
        />
      )}
      {visibilityToast && (
        <div
          style={{
            position: "absolute",
            left: 16,
            bottom: toastBottom,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            color: "white",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 13,
            pointerEvents: "none",
          }}
        >
          {visibilityToast}
        </div>
      )}
      <KeyboardShortcutsDialog
        open={isShortcutsDialogOpen}
        onClose={() => setIsShortcutsDialogOpen(false)}
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
        <CadViewerInner {...props} />
      </LayerVisibilityProvider>
    </CameraControllerProvider>
  )
}
