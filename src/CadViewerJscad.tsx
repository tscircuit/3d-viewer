import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement } from "circuit-json"
import type * as React from "react"
import { forwardRef, useCallback, useMemo, useState } from "react"
import type * as THREE from "three"
import { Euler } from "three"
import { AnyCadComponent } from "./AnyCadComponent"
import { CadViewerContainer } from "./CadViewerContainer"
import { useConvertChildrenToCircuitJson } from "./hooks/use-convert-children-to-soup"
import { useStlsFromGeom } from "./hooks/use-stls-from-geom"
import { useBoardGeomBuilder } from "./hooks/useBoardGeomBuilder"
import { Error3d } from "./three-components/Error3d"
import { FootprinterModel } from "./three-components/FootprinterModel"
import { JscadModel } from "./three-components/JscadModel"
import { MixedStlModel } from "./three-components/MixedStlModel"
import { STLModel } from "./three-components/STLModel"
import { VisibleSTLModel } from "./three-components/VisibleSTLModel"
import { ThreeErrorBoundary } from "./three-components/ThreeErrorBoundary"
import { tuple } from "./utils/tuple"

interface Props {
  /**
   * @deprecated Use circuitJson instead.
   */
  soup?: AnyCircuitElement[]
  circuitJson?: AnyCircuitElement[]
  autoRotateDisabled?: boolean
  clickToInteractEnabled?: boolean
  onUserInteraction?: () => void
}

export const CadViewerJscad = forwardRef<
  THREE.Object3D,
  React.PropsWithChildren<Props>
>(
  (
    {
      soup,
      circuitJson,
      children,
      autoRotateDisabled,
      clickToInteractEnabled,
      onUserInteraction,
    },
    ref,
  ) => {
    const childrenSoup = useConvertChildrenToCircuitJson(children)
    const internalCircuitJson = useMemo(() => {
      const cj = soup ?? circuitJson
      return (cj ?? childrenSoup) as AnyCircuitElement[]
    }, [soup, circuitJson, childrenSoup])

    // Use the new hook to manage board geometry building
    const boardGeom = useBoardGeomBuilder(internalCircuitJson)

    const initialCameraPosition = useMemo(() => {
      if (!internalCircuitJson) return [5, 5, 5] as const
      try {
        const board = su(internalCircuitJson as any).pcb_board.list()[0]
        if (!board) return [5, 5, 5] as const
        const { width, height } = board

        if (!width && !height) {
          return [5, 5, 5] as const
        }

        const minCameraDistance = 5
        const adjustedBoardWidth = Math.max(width, minCameraDistance)
        const adjustedBoardHeight = Math.max(height, minCameraDistance)
        const largestDim = Math.max(adjustedBoardWidth, adjustedBoardHeight)
        return [largestDim / 2, largestDim / 2, largestDim] as const
      } catch (e) {
        console.error(e)
        return [5, 5, 5] as const
      }
    }, [internalCircuitJson])

    const boardDimensions = useMemo(() => {
      if (!internalCircuitJson) return undefined
      try {
        const board = su(internalCircuitJson as any).pcb_board.list()[0]
        if (!board) return undefined
        return { width: board.width ?? 0, height: board.height ?? 0 }
      } catch (e) {
        console.error(e)
        return undefined
      }
    }, [internalCircuitJson])

    const boardCenter = useMemo(() => {
      if (!internalCircuitJson) return undefined
      try {
        const board = su(internalCircuitJson as any).pcb_board.list()[0]
        if (!board || !board.center) return undefined
        return { x: board.center.x, y: board.center.y }
      } catch (e) {
        console.error(e)
        return undefined
      }
    }, [internalCircuitJson])

    // Use the state `boardGeom` which starts simplified and gets updated
    const { stls: boardStls, loading } = useStlsFromGeom(boardGeom)

    const cad_components = su(internalCircuitJson).cad_component.list()

    return (
      <CadViewerContainer
        ref={ref}
        autoRotateDisabled={autoRotateDisabled}
        initialCameraPosition={initialCameraPosition}
        clickToInteractEnabled={clickToInteractEnabled}
        boardDimensions={boardDimensions}
        boardCenter={boardCenter}
        onUserInteraction={onUserInteraction}
      >
        {boardStls.map(({ stlData, color }, index) => (
          <VisibleSTLModel
            key={`board-${index - boardStls.length}`}
            stlData={stlData}
            color={color}
            opacity={index === 0 ? 0.95 : 1}
            index={index}
            totalModels={boardStls.length}
          />
        ))}
        {cad_components.map((cad_component) => (
          <ThreeErrorBoundary
            key={cad_component.cad_component_id}
            fallback={({ error }) => (
              <Error3d cad_component={cad_component} error={error} />
            )}
          >
            <AnyCadComponent
              key={cad_component.cad_component_id}
              cad_component={cad_component}
              circuitJson={internalCircuitJson}
            />
          </ThreeErrorBoundary>
        ))}
      </CadViewerContainer>
    )
  },
)
