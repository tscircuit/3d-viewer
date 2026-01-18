import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, CadComponent } from "circuit-json"
import type { ManifoldToplevel } from "manifold-3d"
import type React from "react"
import { useEffect, useMemo, useState } from "react"
import type * as THREE from "three"
import { useThree } from "./react-three/ThreeContext"
import { AnyCadComponent } from "./AnyCadComponent"
import { CadViewerContainer } from "./CadViewerContainer"
import type { CameraController } from "./hooks/cameraAnimation"
import { useConvertChildrenToCircuitJson } from "./hooks/use-convert-children-to-soup"
import { useManifoldBoardBuilder } from "./hooks/useManifoldBoardBuilder"
import { addFauxBoardIfNeeded } from "./utils/preprocess-circuit-json"
import { Error3d } from "./three-components/Error3d"
import { ThreeErrorBoundary } from "./three-components/ThreeErrorBoundary"
import { createGeometryMeshes } from "./utils/manifold/create-three-geometry-meshes"
import { createTextureMeshes } from "./textures"
import { useLayerVisibility } from "./contexts/LayerVisibilityContext"

declare global {
  interface Window {
    ManifoldModule: any
    MANIFOLD?: any
    MANIFOLD_MODULE?: any
  }
}

const BoardMeshes = ({
  geometryMeshes,
  textureMeshes,
}: {
  geometryMeshes: THREE.Mesh[]
  textureMeshes: THREE.Mesh[]
}) => {
  const { rootObject } = useThree()
  const { visibility } = useLayerVisibility()

  useEffect(() => {
    if (!rootObject) return

    // Filter and add meshes based on visibility settings
    geometryMeshes.forEach((mesh) => {
      let shouldShow = true

      // Board body
      if (mesh.name === "board-geom") {
        shouldShow = visibility.boardBody
      }
      // SMT Pads - check layer-specific visibility
      else if (mesh.name.includes("smt_pad")) {
        if (mesh.name.includes("smt_pad-top")) {
          shouldShow = visibility.topCopper
        } else if (mesh.name.includes("smt_pad-bottom")) {
          shouldShow = visibility.bottomCopper
        } else {
          // Fallback for pads without layer info
          shouldShow = visibility.topCopper || visibility.bottomCopper
        }
      }
      // Plated holes and vias go through both layers
      else if (mesh.name.includes("plated_hole") || mesh.name.includes("via")) {
        shouldShow = visibility.topCopper || visibility.bottomCopper
      }

      if (shouldShow) {
        rootObject.add(mesh)
      }
    })

    textureMeshes.forEach((mesh) => {
      let shouldShow = true

      // Top trace layer (without mask - tan/brown color)
      if (
        mesh.name.includes("top-trace-texture-plane") &&
        !mesh.name.includes("with-mask")
      ) {
        // Show tan/brown trace when soldermask is OFF
        shouldShow = visibility.topCopper && !visibility.topMask
      }
      // Top trace with mask (light green color)
      else if (mesh.name.includes("top-trace-with-mask")) {
        // Show light green trace when soldermask is ON
        shouldShow = visibility.topCopper && visibility.topMask
      }
      // Bottom trace layer (without mask - tan/brown color)
      else if (
        mesh.name.includes("bottom-trace-texture-plane") &&
        !mesh.name.includes("with-mask")
      ) {
        // Show tan/brown trace when soldermask is OFF
        shouldShow = visibility.bottomCopper && !visibility.bottomMask
      }
      // Bottom trace with mask (light green color)
      else if (mesh.name.includes("bottom-trace-with-mask")) {
        // Show light green trace when soldermask is ON
        shouldShow = visibility.bottomCopper && visibility.bottomMask
      }
      // Top silkscreen
      else if (mesh.name.includes("top-silkscreen")) {
        shouldShow = visibility.topSilkscreen
      }
      // Bottom silkscreen
      else if (mesh.name.includes("bottom-silkscreen")) {
        shouldShow = visibility.bottomSilkscreen
      }
      // Top soldermask
      else if (mesh.name.includes("top-soldermask")) {
        shouldShow = visibility.topMask
      }
      // Bottom soldermask
      else if (mesh.name.includes("bottom-soldermask")) {
        shouldShow = visibility.bottomMask
      }
      // Top copper text
      else if (mesh.name.includes("top-copper-text")) {
        shouldShow = visibility.topCopper
      }
      // Bottom copper text
      else if (mesh.name.includes("bottom-copper-text")) {
        shouldShow = visibility.bottomCopper
      }
      // Top copper pours
      else if (mesh.name.includes("top-copper")) {
        shouldShow = visibility.topCopper
      }
      // Bottom copper pours
      else if (mesh.name.includes("bottom-copper")) {
        shouldShow = visibility.bottomCopper
      }
      // Panel outlines
      else if (mesh.name.includes("panel-outlines")) {
        shouldShow = visibility.boardBody
      }

      if (shouldShow) {
        rootObject.add(mesh)
      }
    })

    return () => {
      // Only remove meshes that were actually added
      geometryMeshes.forEach((mesh) => {
        if (mesh.parent === rootObject) {
          rootObject.remove(mesh)
        }
      })
      textureMeshes.forEach((mesh) => {
        if (mesh.parent === rootObject) {
          rootObject.remove(mesh)
        }
      })
    }
  }, [rootObject, geometryMeshes, textureMeshes, visibility])

  return null
}

type CadViewerManifoldProps = {
  autoRotateDisabled?: boolean
  clickToInteractEnabled?: boolean
  onUserInteraction?: () => void
  onCameraControllerReady?: (controller: CameraController | null) => void
} & (
  | { circuitJson: AnyCircuitElement[]; children?: React.ReactNode }
  | { circuitJson?: never; children: React.ReactNode }
)

const MANIFOLD_CDN_BASE_URL = "https://cdn.jsdelivr.net/npm/manifold-3d@3.2.1"

const CadViewerManifold: React.FC<CadViewerManifoldProps> = ({
  circuitJson: circuitJsonProp,
  autoRotateDisabled,
  clickToInteractEnabled,
  onUserInteraction,
  children,
  onCameraControllerReady,
}) => {
  const childrenCircuitJson = useConvertChildrenToCircuitJson(children)
  const circuitJson = useMemo(() => {
    const rawCircuitJson = circuitJsonProp ?? childrenCircuitJson
    return addFauxBoardIfNeeded(rawCircuitJson)
  }, [circuitJsonProp, childrenCircuitJson])

  const [manifoldJSModule, setManifoldJSModule] = useState<any | null>(null)
  const [manifoldLoadingError, setManifoldLoadingError] = useState<
    string | null
  >(null)

  useEffect(() => {
    if (
      window.ManifoldModule &&
      typeof window.ManifoldModule === "object" &&
      window.ManifoldModule.setup
    ) {
      setManifoldJSModule(window.ManifoldModule)
      return
    }

    const initManifold = async (ManifoldModule: any) => {
      try {
        const loadedModule: ManifoldToplevel = await ManifoldModule()
        loadedModule.setup()
        window.ManifoldModule = loadedModule
        setManifoldJSModule(loadedModule)
      } catch (error) {
        console.error("Failed to initialize Manifold:", error)
        setManifoldLoadingError(
          `Failed to initialize Manifold: ${error instanceof Error ? error.message : "Unknown error"}`,
        )
      }
    }

    const existingManifold =
      window.ManifoldModule ?? window.MANIFOLD ?? window.MANIFOLD_MODULE
    if (existingManifold) {
      window.ManifoldModule = existingManifold
      initManifold(window.ManifoldModule)
      return
    }

    const eventName = "manifoldLoaded"
    const handleLoad = () => {
      const loadedManifold =
        window.ManifoldModule ?? window.MANIFOLD ?? window.MANIFOLD_MODULE
      if (loadedManifold) {
        window.ManifoldModule = loadedManifold
        initManifold(window.ManifoldModule)
      } else {
        const errText = "ManifoldModule not found on window after script load."
        console.error(errText)
        setManifoldLoadingError(errText)
      }
    }

    window.addEventListener(eventName, handleLoad, { once: true })

    const script = document.createElement("script")
    script.type = "module"
    script.innerHTML = `
try {
  const { default: ManifoldModule } = await import('${MANIFOLD_CDN_BASE_URL}/manifold.js');
  window.ManifoldModule = ManifoldModule;
} catch (e) {
  console.error('Error importing manifold in dynamic script:', e);
} finally {
  window.dispatchEvent(new CustomEvent('${eventName}'));
}
    `.trim()

    const scriptError = (err: any) => {
      const errText = "Failed to load Manifold loader script."
      console.error(errText, err)
      setManifoldLoadingError(errText)
      window.removeEventListener(eventName, handleLoad)
    }

    script.addEventListener("error", scriptError)
    document.body.appendChild(script)

    return () => {
      window.removeEventListener(eventName, handleLoad)
      script.removeEventListener("error", scriptError)
    }
  }, [])

  const {
    geoms,
    textures,
    pcbThickness,
    error: builderError,
    isLoading: builderIsLoading,
    boardData,
    isFauxBoard,
  } = useManifoldBoardBuilder(manifoldJSModule, circuitJson)

  const geometryMeshes = useMemo(() => createGeometryMeshes(geoms), [geoms])
  const textureMeshes = useMemo(
    () => createTextureMeshes(textures, boardData, pcbThickness, isFauxBoard),
    [textures, boardData, pcbThickness, isFauxBoard],
  )

  const cadComponents = useMemo(
    () => su(circuitJson).cad_component.list(),
    [circuitJson],
  )

  const boardDimensions = useMemo(() => {
    if (!boardData) return undefined
    const { width = 0, height = 0 } = boardData
    return { width, height }
  }, [boardData])

  const boardCenter = useMemo(() => {
    if (!boardData) return undefined
    const { center } = boardData
    if (!center) return undefined
    return { x: center.x, y: center.y }
  }, [boardData])

  const initialCameraPosition = useMemo(() => {
    if (!boardData) return [5, -5, 5] as const
    const { width = 0, height = 0 } = boardData
    const safeWidth = Math.max(width, 1)
    const safeHeight = Math.max(height, 1)
    const largestDim = Math.max(safeWidth, safeHeight, 5)
    return [
      largestDim * 0.4, // Move right
      -largestDim * 0.7, // Move back (negative Y)
      largestDim * 0.9, // Keep height but slightly lower than top-down
    ] as const
  }, [boardData])

  if (manifoldLoadingError) {
    return (
      <div
        style={{
          color: "red",
          padding: "1em",
          border: "1px solid red",
          margin: "1em",
        }}
      >
        Error: {manifoldLoadingError}
      </div>
    )
  }
  if (!manifoldJSModule) {
    return <div style={{ padding: "1em" }}>Loading Manifold module...</div>
  }
  if (builderError) {
    return (
      <div
        style={{
          color: "red",
          padding: "1em",
          border: "1px solid red",
          margin: "1em",
        }}
      >
        Error: {builderError}
      </div>
    )
  }
  if (builderIsLoading) {
    return <div style={{ padding: "1em" }}>Processing board geometry...</div>
  }

  return (
    <CadViewerContainer
      initialCameraPosition={initialCameraPosition}
      autoRotateDisabled={autoRotateDisabled}
      clickToInteractEnabled={clickToInteractEnabled}
      boardDimensions={boardDimensions}
      boardCenter={boardCenter}
      onUserInteraction={onUserInteraction}
      onCameraControllerReady={onCameraControllerReady}
    >
      <BoardMeshes
        geometryMeshes={geometryMeshes}
        textureMeshes={textureMeshes}
      />
      {cadComponents.map((cad_component: CadComponent) => (
        <ThreeErrorBoundary
          key={cad_component.cad_component_id}
          fallback={({ error }) => (
            <Error3d cad_component={cad_component} error={error} />
          )}
        >
          <AnyCadComponent
            cad_component={cad_component}
            circuitJson={circuitJson}
            boardThickness={pcbThickness!}
          />
        </ThreeErrorBoundary>
      ))}
    </CadViewerContainer>
  )
}

export default CadViewerManifold
