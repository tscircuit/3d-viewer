import { SectionProvider, useSection } from "./sections/SectionContext"
import { SectionPanel } from "./sections/SectionPanel"
import { SchematicNavigationContext } from "./contexts/SchematicNavigationContext"
import type { ThreeContextState } from "./react-three/ThreeContext"
import {
  pickSchematicComponent,
  type ViewSchematicComponentEvent,
} from "./utils/pick-schematic-component"
import { resolveFoldPcbs } from "./utils/resolve-fold-pcbs"
import {
  pickCadComponent,
  type PickedCadComponent,
} from "./utils/pick-cad-component"
import { useHiddenCadComponents } from "./hooks/useHiddenCadComponents"
import { configureRuntimeFont } from "./utils/configure-runtime-font"
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

import type { RootCircuit } from "@tscircuit/core"
import { useAssemblyExplosion } from "./assembly-explosion/use-assembly-explosion"
import { AssemblyExplosionContext } from "./assembly-explosion/AssemblyExplosionScene"
import { AssemblyExplosionControl } from "./assembly-explosion/AssemblyExplosionControl"
import type { AnyCircuitElement } from "circuit-json"

import { CadViewerJscad } from "./CadViewerJscad"
import CadViewerManifold from "./CadViewerManifold"
import { CadViewerGlb } from "./CadViewerGlb"
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

export type CadViewerProps = Omit<
  React.ComponentProps<typeof CadViewerJscad>,
  "circuitJson" | "hiddenCadComponentIds"
> & {
  // Preserve support for raw JSON imports whose `type` fields widen to string.
  circuitJson?: any[]
  /** Settled circuit retaining authored assembly.explosion stages. */
  circuit?: RootCircuit
  /** Pre-rendered circuit-json-to-gltf GLB URL. Bypasses geometry/model generation. */
  glbUrl?: string
  /** In-memory alternative to glbUrl. Supply only one GLB source. */
  glbData?: ArrayBuffer
  foldPcbs?: boolean
  /** Enable right-click navigation using the same identity as the PCB viewer. */
  onViewSchematicComponent?: (event: ViewSchematicComponentEvent) => void
}

const CadViewerInner = (props: CadViewerProps) => {
  const section = useSection()
  const glbSource = props.glbUrl ?? props.glbData
  const explosion = useAssemblyExplosion(
    props.circuitJson || glbSource !== undefined ? undefined : props.children,
    props.circuitJson || glbSource !== undefined ? undefined : props.circuit,
    glbSource === undefined ? props.circuitJson : undefined,
  )
  const circuitJson: AnyCircuitElement[] =
    props.circuitJson ?? explosion.assembled
  const [explosionPanelSource, setExplosionPanelSource] = useState<
    AnyCircuitElement[] | null
  >(null)
  const explosionPanelOpen = explosionPanelSource === circuitJson
  const hasAssembly = circuitJson.some(
    (element) => element.type === "cad_component" && !element.pcb_component_id,
  )
  const hasBends = circuitJson.some((element) => element.type === "pcb_bend")
  const hasFlexGeometry =
    hasBends || circuitJson.some((element) => element.type === "pcb_stiffener")
  const [foldPcbsOverride, setFoldPcbs] = useState<boolean | undefined>(
    undefined,
  )
  const foldPcbs = foldPcbsOverride ?? props.foldPcbs
  const resolvedFoldPcbs = resolveFoldPcbs(circuitJson, foldPcbs)
  const circuitJsonKey =
    glbSource === undefined ? JSON.stringify(circuitJson) : undefined
  const circuitKey = glbSource ?? circuitJsonKey!
  const { hiddenCadComponentIds, hideComponent, unhideAllComponents } =
    useHiddenCadComponents(circuitKey)
  const resolvedProps = {
    ...props,
    circuitJson,
    children: undefined,
    hiddenCadComponentIds,
  }
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
  const [selectedCadComponent, setSelectedCadComponent] =
    useState<PickedCadComponent>()
  const handleMenuOpen = useCallback(
    (position: { x: number; y: number }) => {
      setSelectedCadComponent(
        pickCadComponent(sceneRef.current, position, circuitJson),
      )
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

  const viewerKey = props.circuitJson ? circuitJsonKey : undefined
  return (
    <AssemblyExplosionContext.Provider value={explosion}>
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
        {explosionPanelOpen && (
          <AssemblyExplosionControl
            stages={explosion.stages}
            amount={explosion.amount}
            onChange={explosion.setAmount}
            error={explosion.error}
            onClose={() => {
              explosion.setAmount(0)
              setExplosionPanelSource(null)
            }}
          />
        )}
        {glbSource !== undefined ? (
          <CadViewerGlb
            source={glbSource}
            hiddenCadComponentIds={hiddenCadComponentIds}
            autoRotateDisabled={props.autoRotateDisabled || !autoRotate}
            clickToInteractEnabled={props.clickToInteractEnabled}
            onUserInteraction={handleUserInteraction}
            onCameraControllerReady={handleCameraControllerReady}
            referenceObject={referenceObject}
          />
        ) : hasFlexGeometry ? (
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
        <SectionPanel />
        {menuVisible && (
          <ContextMenu
            hasAssembly={hasAssembly}
            componentName={selectedCadComponent?.componentName}
            onHideComponent={
              selectedCadComponent
                ? () => {
                    hideComponent(selectedCadComponent.cad_component_id)
                    closeMenu()
                  }
                : undefined
            }
            onUnhideAllComponents={
              hiddenCadComponentIds.size > 0
                ? () => {
                    unhideAllComponents()
                    closeMenu()
                  }
                : undefined
            }
            onViewSchematicComponent={
              selectedComponent && props.onViewSchematicComponent
                ? () => {
                    props.onViewSchematicComponent?.(selectedComponent)
                    closeMenu()
                  }
                : undefined
            }
            explosionAvailable={
              explosion.stages.length > 0 || !!explosion.error
            }
            onExplosionView={() => {
              setExplosionPanelSource(circuitJson)
              setAutoRotate(false)
              closeMenu()
            }}
            onSectionView={() => {
              if (!section?.spec)
                section?.setSpec({
                  axis: "x",
                  offset: section.bounds
                    ? (section.bounds.min.x + section.bounds.max.x) / 2
                    : 0,
                  flipped: false,
                })
              section?.setEditing(true)
              setAutoRotate(false)
              closeMenu()
            }}
            menuRef={menuRef}
            menuPos={menuPos}
            engine={engine}
            preRendered={glbSource !== undefined}
            flexScene={hasFlexGeometry}
            foldPcbs={resolvedFoldPcbs}
            onFoldPcbsToggle={
              hasBends && glbSource === undefined
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
    </AssemblyExplosionContext.Provider>
  )
}

export const CadViewer = (props: CadViewerProps) => {
  configureRuntimeFont()
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
              <SectionProvider>
                <CadViewerInner {...props} />
              </SectionProvider>
            </ToastProvider>
          </AppearanceProvider>
        </LayerVisibilityProvider>
      </CameraControllerProvider>
    </SchematicNavigationContext.Provider>
  )
}
