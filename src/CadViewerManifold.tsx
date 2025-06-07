import React, { useEffect, useState, useMemo } from "react"
import type { AnyCircuitElement, CadComponent } from "circuit-json"
import { su } from "@tscircuit/soup-util"
import * as THREE from "three"
import { CadViewerContainer } from "./CadViewerContainer"
import ManifoldModule from "manifold-3d"
import manifoldWasmUrl from "../public/manifold.wasm" with { loader: "file" }
import { useManifoldBoardBuilder } from "./hooks/useManifoldBoardBuilder"
import type { ManifoldToplevel } from "manifold-3d/manifold.d.ts"
import { AnyCadComponent } from "./AnyCadComponent"
import { ThreeErrorBoundary } from "./three-components/ThreeErrorBoundary"
import { Error3d } from "./three-components/Error3d"
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
    if (!manifoldWasmUrl) {
      setManifoldLoadingError(
        "Manifold WASM URL not loaded. This is unexpected.",
      )
      return
    }

    fetch(manifoldWasmUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to fetch WASM: ${response.status} ${response.statusText}`,
          )
        }
        return response.arrayBuffer()
      })
      .then((wasmBinary) => {
        return (ManifoldModule as any)({ wasmBinary: wasmBinary }).then(
          (loadedModule: ManifoldToplevel) => {
            loadedModule.setup()
            setManifoldJSModule(loadedModule)
          },
        )
      })
      .catch((err: Error) => {
        console.error("Failed to initialize Manifold module:", err)
        setManifoldLoadingError(
          `Failed to initialize Manifold module: ${err.message}. Check console for details.`,
        )
      })
  }, [manifoldWasmUrl])

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
