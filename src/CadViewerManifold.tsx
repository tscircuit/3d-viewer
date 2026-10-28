import { su } from "@tscircuit/circuit-json-util"
import { transformCircuitJsonCadComponents } from "@tscircuit/flex-utils"
import type { AnyCircuitElement, CadComponent } from "circuit-json"
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
import type { ReferenceObjectType } from "./reference-objects/reference-object"
import { createTextureMeshes } from "./textures"
import { CadCable, getCadCables } from "./three-components/CadCable"
import { Error3d } from "./three-components/Error3d"
import { FitCameraToComparison } from "./three-components/reference-object"
import { ThreeErrorBoundary } from "./three-components/ThreeErrorBoundary"
import { createFlexMeshes } from "./utils/flex-meshes"
import { getInitialCameraPosition } from "./utils/get-initial-camera-position"
import { createGeometryMeshes } from "./utils/manifold/create-three-geometry-meshes"
import { loadManifold } from "./utils/manifold/load-manifold"
import { calculateOutlineBounds } from "./utils/outline-bounds"
import { addFauxBoardIfNeeded } from "./utils/preprocess-circuit-json"
import { resolveFoldPcbs } from "./utils/resolve-fold-pcbs"

export const BoardMeshes = ({
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
          // StrictMode can immediately replay this effect with the same
          // memoized mesh. Keep the map attached so Three.js can re-upload it.
        }
      }

      material.dispose()
    }
  }

  useEffect(() => {
    if (!rootObject) return

    for (const mesh of geometryMeshes) {
      let shouldShow = true
      if (mesh.name === "board-geom" || mesh.name === "board-stiffener") {
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
    }

    return () => {
      for (const mesh of geometryMeshes) {
        if (mesh.parent === rootObject) {
          rootObject.remove(mesh)
        }
        disposeMesh(mesh)
      }
    }
  }, [rootObject, geometryMeshes, visibility])

  useEffect(() => {
    if (!rootObject) return

    for (const mesh of textureMeshes) {
      rootObject.add(mesh)
    }

    return () => {
      for (const mesh of textureMeshes) {
        if (mesh.parent === rootObject) {
          rootObject.remove(mesh)
        }
        disposeMesh(mesh)
      }
    }
  }, [rootObject, textureMeshes])

  return null
}

type CadViewerManifoldProps = {
  foldPcbs?: boolean
  autoRotateDisabled?: boolean
  clickToInteractEnabled?: boolean
  gizmoCubeDisabled?: boolean
  cameraType?: "orthographic" | "perspective"
  onUserInteraction?: () => void
  onCameraControllerReady?: (controller: CameraController | null) => void
  resolveStaticAsset?: (modelUrl: string) => string
  referenceObject?: ReferenceObjectType | null
  hiddenCadComponentIds?: ReadonlySet<string>
} & (
  | { circuitJson: AnyCircuitElement[]; children?: React.ReactNode }
  | { circuitJson?: never; children: React.ReactNode }
)

const CadViewerManifold: React.FC<CadViewerManifoldProps> = ({
  circuitJson: circuitJsonProp,
  foldPcbs,
  autoRotateDisabled,
  clickToInteractEnabled,
  gizmoCubeDisabled,
  onUserInteraction,
  children,
  onCameraControllerReady,
  resolveStaticAsset,
  referenceObject,
  hiddenCadComponentIds,
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
    let isActive = true
    loadManifold()
      .then((module) => {
        if (isActive) setManifoldJSModule(module)
      })
      .catch((error) => {
        if (!isActive) return
        console.error("Failed to initialize Manifold:", error)
        setManifoldLoadingError(
          `Failed to initialize Manifold: ${error instanceof Error ? error.message : "Unknown error"}`,
        )
      })

    return () => {
      isActive = false
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

  const flex = useMemo(() => {
    try {
      const resolvedFoldPcbs = resolveFoldPcbs(circuitJson, foldPcbs)
      const posedJson = transformCircuitJsonCadComponents(circuitJson, {
        foldPcbs: resolvedFoldPcbs,
      })
      const meshes = createFlexMeshes(
        createGeometryMeshes(geoms),
        createTextureMeshes(textures, boardData, pcbThickness, isFauxBoard),
        circuitJson,
        resolvedFoldPcbs,
      )
      return { ...meshes, posedJson, error: undefined }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        geometryMeshes: [],
        textureMeshes: [],
        posedJson: circuitJson,
        bounds: undefined,
      }
    }
  }, [
    geoms,
    textures,
    boardData,
    pcbThickness,
    isFauxBoard,
    circuitJson,
    foldPcbs,
  ])
  const cadComponents = useMemo(
    () =>
      su(flex.posedJson)
        .cad_component.list()
        .filter((cad) => !hiddenCadComponentIds?.has(cad.cad_component_id)),
    [flex.posedJson, hiddenCadComponentIds],
  )
  const cadCables = useMemo(
    () => getCadCables(flex.posedJson),
    [flex.posedJson],
  )

  const boardDimensions = useMemo(() => {
    if (!boardData) return undefined
    const bounds = calculateOutlineBounds(boardData)
    return { width: bounds.width, height: bounds.height }
  }, [boardData])

  const boardCenter = useMemo(() => {
    if (!boardData) return undefined
    const bounds = calculateOutlineBounds(boardData)
    return { x: bounds.centerX, y: bounds.centerY }
  }, [boardData])

  const initialCameraPosition = useMemo(() => {
    return getInitialCameraPosition({ boardDimensions, boardCenter })
  }, [boardDimensions, boardCenter])

  const cameraSessionScope = useMemo(() => {
    if (!boardData) return undefined
    return JSON.stringify({
      pcbBoardId: boardData.pcb_board_id,
      center: boardCenter,
      dimensions: boardDimensions,
    })
  }, [boardData, boardCenter, boardDimensions])

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
  if (builderError || flex.error) {
    return (
      <div
        role="alert"
        style={{
          color: "red",
          padding: "1em",
          border: "1px solid red",
          margin: "1em",
        }}
      >
        Error: {builderError ?? flex.error}
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
      gizmoCubeDisabled={gizmoCubeDisabled}
      boardDimensions={boardDimensions}
      boardCenter={boardCenter}
      cameraSessionScope={cameraSessionScope}
      referenceObject={referenceObject}
      onUserInteraction={onUserInteraction}
      onCameraControllerReady={onCameraControllerReady}
    >
      <BoardMeshes
        geometryMeshes={flex.geometryMeshes}
        textureMeshes={flex.textureMeshes}
      />
      {flex.bounds && <FitCameraToComparison bounds={flex.bounds} />}
      {cadComponents.map((cad_component: CadComponent) => (
        <ThreeErrorBoundary
          key={cad_component.cad_component_id}
          fallback={({ error }) => (
            <Error3d cad_component={cad_component} error={error} />
          )}
        >
          <AnyCadComponent
            cad_component={cad_component}
            circuitJson={flex.posedJson}
            resolveStaticAsset={resolveStaticAsset}
          />
        </ThreeErrorBoundary>
      ))}
      {cadCables.map((cable) => (
        <CadCable key={cable.cad_cable_id} cable={cable} />
      ))}
    </CadViewerContainer>
  )
}

export default CadViewerManifold
