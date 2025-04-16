import type { AnyCircuitElement } from "circuit-json"
import type * as React from "react"
import type * as THREE from "three"
import { useConvertChildrenToSoup } from "./hooks/use-convert-children-to-soup"
import { su } from "@tscircuit/soup-util"
import { useEffect, useMemo, forwardRef } from "react"
import { createBoardGeomFromCircuitJson } from "./soup-to-3d"
import { useStlsFromGeom } from "./hooks/use-stls-from-geom"
import { STLModel } from "./three-components/STLModel"
import { CadViewerContainer } from "./CadViewerContainer"
import { MixedStlModel } from "./three-components/MixedStlModel"
import { Euler } from "three"
import { JscadModel } from "./three-components/JscadModel"
import { Footprinter3d } from "jscad-electronics"
import { FootprinterModel } from "./three-components/FootprinterModel"
import { tuple } from "./utils/tuple"
import { AnyCadComponent } from "./AnyCadComponent"
import { Text } from "@react-three/drei"
import { ThreeErrorBoundary } from "./three-components/ThreeErrorBoundary"
import { Error3d } from "./three-components/Error3d"

interface Props {
  /**
   * @deprecated Use circuitJson instead.
   */
  soup?: AnyCircuitElement[]
  circuitJson?: AnyCircuitElement[]
  autoRotateDisabled?: boolean
  clickToInteractEnabled?: boolean
}

export const CadViewer = forwardRef<
  THREE.Object3D,
  React.PropsWithChildren<Props>
>(
  (
    { soup, circuitJson, children, autoRotateDisabled, clickToInteractEnabled },
    ref,
  ) => {
    circuitJson ??= soup
    circuitJson ??= useConvertChildrenToSoup(children, circuitJson) as any

    const initialCameraPosition = useMemo(() => {
      if (!circuitJson) return [5, 5, 5] as const
      try {
        const board = su(circuitJson as any).pcb_board.list()[0]
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
    }, [circuitJson])

    const boardGeom = useMemo(() => {
      if (!circuitJson) return null
      if (!circuitJson.some((e) => e.type === "pcb_board")) return null
      return createBoardGeomFromCircuitJson(circuitJson, {
        simplifiedBoard: true,
      })
    }, [circuitJson])

    const { stls: boardStls, loading } = useStlsFromGeom(boardGeom)

    if (!circuitJson) return null

    const cad_components = su(circuitJson).cad_component.list()

    return (
      <CadViewerContainer
        ref={ref}
        autoRotateDisabled={autoRotateDisabled}
        initialCameraPosition={initialCameraPosition}
        clickToInteractEnabled={clickToInteractEnabled}
      >
        {boardStls.map(({ stlUrl, color }, index) => (
          <STLModel
            key={stlUrl}
            stlUrl={stlUrl}
            color={color}
            opacity={index === 0 ? 0.95 : 1}
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
              circuitJson={circuitJson}
            />
          </ThreeErrorBoundary>
        ))}
      </CadViewerContainer>
    )
  },
)
