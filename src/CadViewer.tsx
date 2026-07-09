import type React from "react"
import { useState, useCallback, useRef, useEffect } from "react"
import * as THREE from "three"

// Constants for camera initialization - defined once, reused across renders
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0)
const INITIAL_CAMERA_POSITION = [5, -5, 5] as const

const readStoredCameraType = (): "perspective" | "orthographic" | undefined => {
  if (typeof window === "undefined") return undefined
  const stored = window.localStorage.getItem("cadViewerCameraType")
  return stored === "orthographic" || stored === "perspective"
    ? stored
    : undefined
}
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
  RenderingModeProvider,
  useRenderingMode,
  type RenderingMode,
} from "./contexts/RenderingModeContext"
import {
  CameraControllerProvider,
  useCameraController,
} from "./contexts/CameraControllerContext"
import { ToastProvider, useToast } from "./contexts/ToastContext"
import { ContextMenu } from "./components/ContextMenu"
import { KeyboardShortcutsDialog } from "./components/KeyboardShortcutsDialog"
import type { CameraController, CameraPreset } from "./hooks/cameraAnimation"
import type {
  CadViewerBackground,
  CadViewerCallout,
  CadViewerVisualStyle,
} from "./presentation-types"

export type { CadViewerBackground, CadViewerCallout, CadViewerVisualStyle }

export type CadViewerProps = {
  visualStyle?: CadViewerVisualStyle
  renderingMode?: RenderingMode
  cameraPreset?: CameraPreset
  showCallouts?: boolean
  callouts?: CadViewerCallout[]
  background?: CadViewerBackground
  resolveStaticAsset?: (modelUrl: string) => string
  onCameraControllerReady?: (controller: CameraController | null) => void
  autoRotateDisabled?: boolean
  clickToInteractEnabled?: boolean
  circuitJson?: any[]
  children?: React.ReactNode
}

const getRenderingModeFromVisualStyle = (
  visualStyle?: CadViewerVisualStyle,
): RenderingMode | undefined => {
  if (visualStyle === "presentation") return "realistic"
  if (visualStyle === "engineering") return "engineering"
  return undefined
}

const CadViewerInner = (props: CadViewerProps) => {
  const [engine, setEngine] = useState<"jscad" | "manifold">(() => {
    const stored = window.localStorage.getItem("cadViewerEngine")
    return stored === "jscad" || stored === "manifold" ? stored : "manifold"
  })
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isKeyboardShortcutsDialogOpen, setIsKeyboardShortcutsDialogOpen] =
    useState(false)
  const [autoRotate, setAutoRotate] = useState(() => {
    if (props.cameraPreset && props.cameraPreset !== "Custom") return false
    const stored = window.localStorage.getItem("cadViewerAutoRotate")
    return stored === "false" ? false : true
  })
  const [autoRotateUserToggled, setAutoRotateUserToggled] = useState(() => {
    const stored = window.localStorage.getItem("cadViewerAutoRotateUserToggled")
    return stored === "true"
  })
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>(
    props.cameraPreset ?? "Custom",
  )
  const { cameraType, setCameraType } = useCameraController()
  const { visibility, setLayerVisibility } = useLayerVisibility()
  const { renderingMode, setRenderingMode } = useRenderingMode()
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

  const requestedRenderingMode =
    props.renderingMode ?? getRenderingModeFromVisualStyle(props.visualStyle)

  useEffect(() => {
    if (requestedRenderingMode && requestedRenderingMode !== renderingMode) {
      setRenderingMode(requestedRenderingMode)
    }
  }, [renderingMode, requestedRenderingMode, setRenderingMode])

  useEffect(() => {
    if (!props.cameraPreset || props.cameraPreset === cameraPreset) return

    setCameraPreset(props.cameraPreset)
    if (props.cameraPreset === "Custom") return

    setAutoRotate(false)
    setAutoRotateUserToggled(true)
    lastPresetSelectTime.current = Date.now()
    cameraControllerRef.current?.animateToPreset(props.cameraPreset)
  }, [cameraPreset, props.cameraPreset])

  const exportHeroPng = useCallback(() => {
    const canvas = containerRef.current?.querySelector("canvas")
    if (!(canvas instanceof HTMLCanvasElement)) {
      showToast("No canvas available to export", 1800)
      return
    }

    try {
      const dataUrl = canvas.toDataURL("image/png")
      const link = document.createElement("a")
      link.href = dataUrl
      link.download = "tscircuit-hero-render.png"
      document.body.appendChild(link)
      link.click()
      link.remove()
      showToast("Hero PNG exported", 1800)
    } catch (error) {
      console.error("Failed to export hero PNG", error)
      showToast("Hero PNG export failed", 2200)
    }
  }, [showToast])

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
          onExportHeroPng={() => {
            exportHeroPng()
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

export const CadViewer = (props: CadViewerProps) => {
  const initialRenderingMode =
    props.renderingMode ?? getRenderingModeFromVisualStyle(props.visualStyle)

  return (
    <CameraControllerProvider
      defaultTarget={DEFAULT_TARGET}
      initialCameraPosition={INITIAL_CAMERA_POSITION}
      initialCameraType={readStoredCameraType()}
    >
      <LayerVisibilityProvider>
        <RenderingModeProvider initialMode={initialRenderingMode}>
          <ToastProvider>
            <CadViewerInner {...props} />
          </ToastProvider>
        </RenderingModeProvider>
      </LayerVisibilityProvider>
    </CameraControllerProvider>
  )
}
