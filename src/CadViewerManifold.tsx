import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, CadComponent } from "circuit-json"
import ManifoldModule from "manifold-3d"
import type { ManifoldToplevel } from "manifold-3d/manifold.d.ts"
import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { AnyCadComponent } from "./AnyCadComponent"
import { CadViewerContainer } from "./CadViewerContainer"
import { useConvertChildrenToSoup } from "./hooks/use-convert-children-to-soup"
import { useManifoldBoardBuilder } from "./hooks/useManifoldBoardBuilder"
import { Error3d } from "./three-components/Error3d"
import { ThreeErrorBoundary } from "./three-components/ThreeErrorBoundary"
import { createGeometryMeshes } from "./utils/manifold/create-three-geometry-meshes"
import { createTextureMeshes } from "./utils/manifold/create-three-texture-meshes"

type CadViewerManifoldProps = {
  autoRotateDisabled?: boolean
  clickToInteractEnabled?: boolean
  onUserInteraction?: () => void
} & (
  | { circuitJson: AnyCircuitElement[]; children?: React.ReactNode }
  | { circuitJson?: never; children: React.ReactNode }
)

const MANIFOLD_CDN_BASE_URL = "https://cdn.jsdelivr.net/npm/manifold-3d@3.1.1"

const CadViewerManifold: React.FC<CadViewerManifoldProps> = ({
  circuitJson: circuitJsonProp,
  autoRotateDisabled,
  clickToInteractEnabled,
  onUserInteraction,
  children,
}) => {
  const childrenCircuitJson = useConvertChildrenToSoup(children)
  const circuitJson = useMemo(() => {
    return circuitJsonProp ?? childrenCircuitJson
  }, [circuitJsonProp, childrenCircuitJson])

  const [manifoldJSModule, setManifoldJSModule] =
    useState<ManifoldToplevel | null>(null)
  const [manifoldLoadingError, setManifoldLoadingError] = useState<
    string | null
  >(null)

  useEffect(() => {
    const loadManifoldWasmFromCDN = async () => {
      try {
        const wasmUrl = `${MANIFOLD_CDN_BASE_URL}/manifold.wasm`

        const manifoldConfig = {
          locateFile: (path: string, scriptDirectory: string) => {
            if (path === "manifold.wasm") {
              return wasmUrl
            }
            return scriptDirectory + path
          },
        }

        // Use the imported ManifoldModule with CDN WASM
        const loadedModule = (await (ManifoldModule as any)(
          manifoldConfig,
        )) as ManifoldToplevel
        loadedModule.setup()
        setManifoldJSModule(loadedModule)
      } catch (error) {
        console.error("Failed to load Manifold from CDN:", error)
        setManifoldLoadingError(
          `Failed to load Manifold module: ${error instanceof Error ? error.message : "Unknown error"}`,
        )
      }
    }

    loadManifoldWasmFromCDN()
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
    () => su(circuitJson).cad_component.list(),
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
  if (builderIsLoading) {
    return <div style={{ padding: "1em" }}>Processing board geometry...</div>
  }

  return (
    <CadViewerContainer
      initialCameraPosition={initialCameraPosition}
      autoRotateDisabled={autoRotateDisabled}
      clickToInteractEnabled={clickToInteractEnabled}
      boardDimensions={boardDimensions}
      onUserInteraction={onUserInteraction}
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
