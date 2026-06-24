import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, CadComponent } from "circuit-json"
import type { ManifoldToplevel } from "manifold-3d"
import type React from "react"
import { useEffect, useMemo, useState } from "react"
import * as THREE from "three"
import { AnyCadComponent } from "./AnyCadComponent"
import { CadViewerContainer } from "./CadViewerContainer"
import { useLayerVisibility } from "./contexts/LayerVisibilityContext"
import type { CameraController } from "./hooks/cameraAnimation"
import { useConvertChildrenToCircuitJson } from "./hooks/use-convert-children-to-soup"
import { useManifoldBoardBuilder } from "./hooks/useManifoldBoardBuilder"
import { useThree } from "./react-three/ThreeContext"
import { createTextureMeshes } from "./textures"
import { Error3d } from "./three-components/Error3d"
import { ThreeErrorBoundary } from "./three-components/ThreeErrorBoundary"
import { createGeometryMeshes } from "./utils/manifold/create-three-geometry-meshes"
import { addFauxBoardIfNeeded } from "./utils/preprocess-circuit-json"

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

  const disposeMesh = (mesh: THREE.Mesh) => {
    mesh.geometry.dispose()
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]

    for (const material of materials) {
      if (!material) continue

      const textureProps = [
        "map",
        "alphaMap",
        "aoMap",
        "bumpMap",
        "displacementMap",
        "emissiveMap",
        "lightMap",
        "metalnessMap",
        "normalMap",
        "roughnessMap",
        "specularMap",
      ] as const
      const typedMaterial = material as THREE.Material &
        Record<(typeof textureProps)[number], THREE.Texture | null | undefined>

      for (const prop of textureProps) {
        const texture = typedMaterial[prop]
        if (texture && texture instanceof THREE.Texture) {
          texture.dispose()
          typedMaterial[prop] = null
        }
      }

      material.dispose()
    }
  }

  useEffect(() => {
    if (!rootObject) return

    geometryMeshes.forEach((mesh) => {
      let shouldShow = true
      if (mesh.name === "board-geom") {
        shouldShow = visibility.boardBody
      } else if (
        mesh.name.includes("plated_hole") ||
        mesh.name.includes("via")
      ) {
        shouldShow = visibility.topCopper || visibility.bottomCopper
      }

      if (shouldShow) {
        rootObject.add(mesh)
      }
    })

    return () => {
      geometryMeshes.forEach((mesh) => {
        if (mesh.parent === rootObject) {
          rootObject.remove(mesh)
        }
        disposeMesh(mesh)
      })
    }
  }, [rootObject, geometryMeshes, visibility])

  useEffect(() => {
    if (!rootObject) return

    textureMeshes.forEach((mesh) => {
      rootObject.add(mesh)
    })

    return () => {
      textureMeshes.forEach((mesh) => {
        if (mesh.parent === rootObject) {
          rootObject.remove(mesh)
        }
        disposeMesh(mesh)
      })
    }
  }, [rootObject, textureMeshes])

  return null
}

type CadViewerManifoldProps = {
  autoRotateDisabled?: boolean
  clickToInteractEnabled?: boolean
  cameraType?: "orthographic" | "perspective"
  onUserInteraction?: () => void
  onCameraControllerReady?: (controller: CameraController | null) => void
  resolveStaticAsset?: (modelUrl: string) => string
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
  resolveStaticAsset,
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
  const { visibility } = useLayerVisibility()

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
  } = useManifoldBoardBuilder(manifoldJSModule, circuitJson, visibility)

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
            resolveStaticAsset={resolveStaticAsset}
          />
        </ThreeErrorBoundary>
      ))}
    </CadViewerContainer>
  )
}

export default CadViewerManifold
