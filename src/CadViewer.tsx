import { SchematicNavigationContext } from "./contexts/SchematicNavigationContext"
import type { ThreeContextState } from "./react-three/ThreeContext"
import {
  pickSchematicComponent,
  type ViewSchematicComponentEvent,
} from "./utils/pick-schematic-component"
import { resolveFoldPcbs } from "./utils/resolve-fold-pcbs"
import { useCallback, useContext, useEffect, useRef, useState } from "react"
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

import { useConvertChildrenToCircuitJson } from "./hooks/use-convert-children-to-soup"
import type { AnyCircuitElement } from "circuit-json"

import { CadViewerJscad } from "./CadViewerJscad"
import CadViewerManifold from "./CadViewerManifold"
import { ContextMenu } from "./components/ContextMenu"
import { KeyboardShortcutsDialog } from "./components/KeyboardShortcutsDialog"
import { AppearanceProvider } from "./contexts/appearance-context"
import {
  CameraControllerProvider,
  useCameraController,
} from "./contexts/CameraControllerContext"
import {
  LayerVisibilityProvider,
  useLayerVisibility,
} from "./contexts/LayerVisibilityContext"
import { ToastProvider, useToast } from "./contexts/ToastContext"
import type { CameraController, CameraPreset } from "./hooks/cameraAnimation"
import { useCameraPreset } from "./hooks/useCameraPreset"
import { useContextMenu } from "./hooks/useContextMenu"
import { useGlobalDownloadGltf } from "./hooks/useGlobalDownloadGltf"
import {
  registerHotkeyViewer,
  useRegisteredHotkey,
} from "./hooks/useRegisteredHotkey"
import {
  type ReferenceObjectType,
  toggleReferenceObject,
} from "./reference-objects/reference-object"

export type CadViewerProps = React.ComponentProps<typeof CadViewerJscad> & {
  foldPcbs?: boolean
  /** Enable right-click navigation using the same identity as the PCB viewer. */
  onViewSchematicComponent?: (event: ViewSchematicComponentEvent) => void
}

const CadViewerInner = (props: CadViewerProps) => {
  const childrenCircuitJson = useConvertChildrenToCircuitJson(
    props.circuitJson ? undefined : props.children,
  )
  const circuitJson: AnyCircuitElement[] =
    props.circuitJson ?? childrenCircuitJson
  const hasBends = circuitJson.some((element) => element.type === "pcb_bend")
  const hasFlexGeometry =
    hasBends || circuitJson.some((element) => element.type === "pcb_stiffener")
  const [foldPcbsOverride, setFoldPcbs] = useState<boolean | undefined>(
    undefined,
  )
  const foldPcbs = foldPcbsOverride ?? props.foldPcbs
  const resolvedFoldPcbs = resolveFoldPcbs(circuitJson, foldPcbs)
  const resolvedProps = { ...props, circuitJson, children: undefined }
  const [engine, setEngine] = useState<"jscad" | "manifold">(() => {
    const stored = window.localStorage.getItem("cadViewerEngine")
    return stored === "jscad" || stored === "manifold" ? stored : "manifold"
  })
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isKeyboardShortcutsDialogOpen, setIsKeyboardShortcutsDialogOpen] =
    useState(false)
  const [autoRotate, setAutoRotate] = useState(() => {
    const stored = window.localStorage.getItem("cadViewerAutoRotate")
    return stored !== "false"
  })
  const [autoRotateUserToggled, setAutoRotateUserToggled] = useState(() => {
    const stored = window.localStorage.getItem("cadViewerAutoRotateUserToggled")
    return stored === "true"
  })
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("Custom")
  const [referenceObject, setReferenceObject] =
    useState<ReferenceObjectType | null>(null)
  const { cameraType } = useCameraController()
  const { visibility, setLayerVisibility } = useLayerVisibility()
  const { showToast } = useToast()

  const cameraControllerRef = useRef<CameraController | null>(null)
  const externalCameraControllerReady = props.onCameraControllerReady as
    | ((controller: CameraController | null) => void)
    | undefined

  const sceneRef = useContext(SchematicNavigationContext)!
  const [selectedComponent, setSelectedComponent] =
    useState<ViewSchematicComponentEvent>()
  const handleMenuOpen = useCallback(
    (position: { x: number; y: number }) => {
      setSelectedComponent(
        props.onViewSchematicComponent
          ? pickSchematicComponent(sceneRef.current, position, circuitJson)
          : undefined,
      )
    },
    [sceneRef, circuitJson, props.onViewSchematicComponent],
  )

  const {
    menuVisible,
    menuPos,
    menuRef,
    contextMenuEventHandlers,
    setMenuVisible,
  } = useContextMenu({ containerRef, onOpen: handleMenuOpen })

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
      {hasFlexGeometry ? (
        <CadViewerManifold
          {...resolvedProps}
          foldPcbs={foldPcbs}
          autoRotateDisabled={props.autoRotateDisabled || !autoRotate}
          onUserInteraction={handleUserInteraction}
          onCameraControllerReady={handleCameraControllerReady}
          referenceObject={referenceObject}
        />
      ) : engine === "jscad" ? (
        <CadViewerJscad
          {...resolvedProps}
          autoRotateDisabled={props.autoRotateDisabled || !autoRotate}
          cameraType={cameraType}
          onUserInteraction={handleUserInteraction}
          onCameraControllerReady={handleCameraControllerReady}
          referenceObject={referenceObject}
        />
      ) : (
        <CadViewerManifold
          {...resolvedProps}
          autoRotateDisabled={props.autoRotateDisabled || !autoRotate}
          cameraType={cameraType}
          onUserInteraction={handleUserInteraction}
          onCameraControllerReady={handleCameraControllerReady}
          referenceObject={referenceObject}
        />
      )}
      {menuVisible && (
        <ContextMenu
          onViewSchematicComponent={
            selectedComponent && props.onViewSchematicComponent
              ? () => {
                  props.onViewSchematicComponent?.(selectedComponent)
                  closeMenu()
                }
              : undefined
          }
          menuRef={menuRef}
          menuPos={menuPos}
          engine={engine}
          flexScene={hasFlexGeometry}
          foldPcbs={resolvedFoldPcbs}
          onFoldPcbsToggle={
            hasBends
              ? () => {
                  setFoldPcbs(!resolvedFoldPcbs)
                  setCameraPreset("Custom")
                  closeMenu()
                }
              : undefined
          }
          cameraPreset={cameraPreset}
          autoRotate={autoRotate}
          referenceObject={referenceObject}
          onEngineSwitch={(newEngine) => {
            setEngine(newEngine)
            closeMenu()
          }}
          onCameraPresetSelect={handleCameraPresetSelect}
          onAutoRotateToggle={() => {
            toggleAutoRotate()
            closeMenu()
          }}
          onReferenceObjectSelect={(nextReferenceObject) => {
            setReferenceObject((currentReferenceObject) =>
              toggleReferenceObject(
                currentReferenceObject,
                nextReferenceObject,
              ),
            )
            setAutoRotate(false)
            setAutoRotateUserToggled(true)
            setCameraPreset("Custom")
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

export const CadViewer = (props: CadViewerProps) => {
  const sceneRef = useRef<ThreeContextState | null>(null)
  return (
    <SchematicNavigationContext.Provider value={sceneRef}>
      <CameraControllerProvider
        defaultTarget={DEFAULT_TARGET}
        initialCameraPosition={INITIAL_CAMERA_POSITION}
        initialCameraType={readStoredCameraType()}
      >
        <LayerVisibilityProvider>
          <AppearanceProvider>
            <ToastProvider>
              <CadViewerInner {...props} />
            </ToastProvider>
          </AppearanceProvider>
        </LayerVisibilityProvider>
      </CameraControllerProvider>
    </SchematicNavigationContext.Provider>
  )
}
