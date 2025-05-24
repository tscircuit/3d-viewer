import React, { useEffect, useState, useMemo } from "react"
import type { AnyCircuitElement, CadComponent } from "circuit-json"
import { su } from "@tscircuit/soup-util"
import * as THREE from "three"
import { CadViewerContainer } from "../CadViewerContainer"
import ManifoldModule from "manifold-3d"
import { useManifoldBoardBuilder } from "../hooks/useManifoldBoardBuilder"
import type { ManifoldToplevel } from "manifold-3d/manifold.d.ts"
import { AnyCadComponent } from "../AnyCadComponent"
import { ThreeErrorBoundary } from "../three-components/ThreeErrorBoundary"
import { Error3d } from "../three-components/Error3d"

interface ManifoldViewerProps {
  circuitJson: AnyCircuitElement[]
  autoRotateDisabled?: boolean
  clickToInteractEnabled?: boolean
}

export const ManifoldViewer: React.FC<ManifoldViewerProps> = ({
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
    boardThreeGeom,
    boardColor,
    otherComponentGeoms,
    topTraceTexture,
    bottomTraceTexture,
    topSilkscreenTexture,
    bottomSilkscreenTexture,
    pcbThickness,
    error: builderError,
    isLoading: builderIsLoading,
    boardData,
  } = useManifoldBoardBuilder(manifoldJSModule, circuitJson)

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
  if (builderIsLoading || !boardData) {
    return <div style={{ padding: "1em" }}>Processing board geometry...</div>
  }
  if (!boardThreeGeom) {
    return <div style={{ padding: "1em" }}>Preparing board display...</div>
  }

  return (
    <CadViewerContainer
      initialCameraPosition={initialCameraPosition}
      autoRotateDisabled={autoRotateDisabled}
      clickToInteractEnabled={clickToInteractEnabled}
    >
      <mesh geometry={boardThreeGeom}>
        <meshStandardMaterial
          color={boardColor}
          side={THREE.DoubleSide}
          flatShading={true}
        />
      </mesh>
      {topTraceTexture && boardData && pcbThickness !== null && (
        <mesh
          position={[
            boardData.center.x,
            boardData.center.y,
            pcbThickness / 2 + 0.015,
          ]}
        >
          <planeGeometry args={[boardData.width, boardData.height]} />
          <meshBasicMaterial
            map={topTraceTexture}
            transparent
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
      {topSilkscreenTexture && boardData && pcbThickness !== null && (
        <mesh
          position={[
            boardData.center.x,
            boardData.center.y,
            pcbThickness / 2 + 0.017,
          ]}
        >
          <planeGeometry args={[boardData.width, boardData.height]} />
          <meshBasicMaterial
            map={topSilkscreenTexture}
            transparent
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
      {bottomTraceTexture && boardData && pcbThickness !== null && (
        <mesh
          position={[
            boardData.center.x,
            boardData.center.y,
            -pcbThickness / 2 - 0.015,
          ]}
          rotation={[Math.PI, 0, 0]}
        >
          <planeGeometry args={[boardData.width, boardData.height]} />
          <meshBasicMaterial
            map={bottomTraceTexture}
            transparent
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
      {bottomSilkscreenTexture && boardData && pcbThickness !== null && (
        <mesh
          position={[
            boardData.center.x,
            boardData.center.y,
            -pcbThickness / 2 - 0.017,
          ]}
          rotation={[Math.PI, 0, 0]}
        >
          <planeGeometry args={[boardData.width, boardData.height]} />
          <meshBasicMaterial
            map={bottomSilkscreenTexture}
            transparent
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
      {otherComponentGeoms.map((comp) => (
        <mesh key={comp.key} geometry={comp.geometry}>
          <meshStandardMaterial
            color={comp.color}
            side={THREE.DoubleSide}
            flatShading
          />
        </mesh>
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
