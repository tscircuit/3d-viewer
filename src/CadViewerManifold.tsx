import { su } from "@tscircuit/soup-util"
import type { AnyCircuitElement, CadComponent } from "circuit-json"
import ManifoldModule from "manifold-3d"
import type { ManifoldToplevel } from "manifold-3d/manifold.d.ts"
import type React from "react"
import { useEffect, useMemo, useState } from "react"
import * as THREE from "three"
import { AnyCadComponent } from "./AnyCadComponent"
import { CadViewerContainer } from "./CadViewerContainer"
import { useManifoldBoardBuilder } from "./hooks/useManifoldBoardBuilder"
import { Error3d } from "./three-components/Error3d"
import { ThreeErrorBoundary } from "./three-components/ThreeErrorBoundary"
import { createGeometryMeshes } from "./utils/manifold/create-three-geometry-meshes"
import { createTextureMeshes } from "./utils/manifold/create-three-texture-meshes"

interface CadViewerManifoldProps {
  circuitJson: AnyCircuitElement[]
  autoRotateDisabled?: boolean
  clickToInteractEnabled?: boolean
}

const CadViewerManifold: React.FC<CadViewerManifoldProps> = ({
  circuitJson,
  autoRotateDisabled,
  clickToInteractEnabled,
}) => {
  const [manifoldJSModule, setManifoldJSModule] =
    useState<ManifoldToplevel | null>(null)
  const [manifoldLoadingError, setManifoldLoadingError] = useState<
    string | null
  >(null)

  useEffect(() => {
    const manifoldConfig = {
      locateFile: (path: string, scriptDirectory: string) =>
        path === "manifold.wasm" ? "/manifold.wasm" : scriptDirectory + path,
    }
    ;(ManifoldModule as any)(manifoldConfig)
      .then((loadedModule: ManifoldToplevel) => {
        loadedModule.setup()
        setManifoldJSModule(loadedModule)
      })
      .catch(() => {
        setManifoldLoadingError(
          "Failed to load Manifold module. Check console for details.",
        )
      })
  }, [])

  const {
    geoms,
    textures,
    pcbThickness,
    error: builderError,
    isLoading: builderIsLoading,
    boardData,
  } = useManifoldBoardBuilder(manifoldJSModule, circuitJson)

  const geometryMeshes = useMemo(() => createGeometryMeshes(geoms), [geoms])
  const textureMeshes = useMemo(
    () => createTextureMeshes(textures, boardData, pcbThickness),
    [textures, boardData, pcbThickness],
  )

  const cadComponents = useMemo(
    () => (circuitJson ? su(circuitJson).cad_component.list() : []),
    [circuitJson],
  )

  const boardDimensions = useMemo(() => {
    if (!boardData) return undefined
    const { width = 0, height = 0 } = boardData
    return { width, height }
  }, [boardData])

  const initialCameraPosition = useMemo(() => {
    if (!boardData) return [5, 5, 5] as const
    const { width = 0, height = 0 } = boardData
    const safeWidth = Math.max(width, 1)
    const safeHeight = Math.max(height, 1)
    const largestDim = Math.max(safeWidth, safeHeight, 5)
    return [largestDim * 0.75, largestDim * 0.75, largestDim * 0.75] as const
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
  if (builderIsLoading || !boardData || !geoms || !textures) {
    return <div style={{ padding: "1em" }}>Processing board geometry...</div>
  }

  return (
    <CadViewerContainer
      initialCameraPosition={initialCameraPosition}
      autoRotateDisabled={autoRotateDisabled}
      clickToInteractEnabled={clickToInteractEnabled}
      boardDimensions={boardDimensions}
    >
      {geometryMeshes.map((mesh, index) => (
        <primitive object={mesh} key={`${mesh.name}-${index}`} />
      ))}
      {textureMeshes.map((mesh, index) => (
        <primitive object={mesh} key={`${mesh.name}-${index}`} />
      ))}
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
          />
        </ThreeErrorBoundary>
      ))}
    </CadViewerContainer>
  )
}

export default CadViewerManifold
