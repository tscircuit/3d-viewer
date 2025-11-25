import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement } from "circuit-json"
import type * as React from "react"
import { forwardRef, useCallback, useEffect, useMemo, useState } from "react"
import * as THREE from "three"
import { Euler } from "three"
import { AnyCadComponent } from "./AnyCadComponent"
import { CadViewerContainer } from "./CadViewerContainer"
import type { CameraController } from "./hooks/cameraAnimation"
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
import { addFauxBoardIfNeeded } from "./utils/preprocess-circuit-json"
import { tuple } from "./utils/tuple"
import { useCameraController } from "./contexts/CameraControllerContext"

interface Props {
  /**
   * @deprecated Use circuitJson instead.
   */
  soup?: AnyCircuitElement[]
  circuitJson?: AnyCircuitElement[]
  autoRotateDisabled?: boolean
  clickToInteractEnabled?: boolean
  onUserInteraction?: () => void
  onCameraControllerReady?: (controller: CameraController | null) => void
  defaultTarget: THREE.Vector3
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
      onCameraControllerReady,
      defaultTarget,
    },
    ref,
  ) => {
    const childrenSoup = useConvertChildrenToCircuitJson(children)
    const internalCircuitJson = useMemo(() => {
      const cj = soup ?? circuitJson
      return addFauxBoardIfNeeded(cj ?? childrenSoup) as AnyCircuitElement[]
    }, [soup, circuitJson, childrenSoup])

    // Use the new hook to manage board geometry building
    const boardGeom = useBoardGeomBuilder(internalCircuitJson)

    const initialCameraPosition = useMemo(() => {
      if (!internalCircuitJson) return [5, -5, 5] as const
      try {
        const board = su(internalCircuitJson as any).pcb_board.list()[0]
        if (!board) return [5, -5, 5] as const
        const { width, height } = board

        if (!width && !height) {
          return [5, -5, 5] as const
        }

        const minCameraDistance = 5
        const adjustedBoardWidth = Math.max(width!, minCameraDistance)
        const adjustedBoardHeight = Math.max(height!, minCameraDistance)
        const largestDim = Math.max(adjustedBoardWidth, adjustedBoardHeight)
        // Position the camera for a top-front-right view
        return [
          largestDim * 0.4, // Move right
          -largestDim * 0.7, // Move back (negative Y)
          largestDim * 0.9, // Keep height but slightly lower than top-down
        ] as const
      } catch (e) {
        console.error(e)
        return [5, -5, 5] as const
      }
    }, [internalCircuitJson])

    const isFauxBoard = useMemo(() => {
      if (!internalCircuitJson) return false
      try {
        const board = su(internalCircuitJson as any).pcb_board.list()[0]
        return !!board && board.pcb_board_id === "faux-board"
      } catch (e) {
        return false
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

    const { setBoundingBox } = useCameraController()

    const boundingBox = useMemo(() => {
      const box = new THREE.Box3()
      boardGeom.forEach((geom: Geom3) => {
        if (geom.bounds) {
          box.min.min(new THREE.Vector3(...geom.bounds.min))
          box.max.max(new THREE.Vector3(...geom.bounds.max))
        }
      })
      cad_components.forEach((comp) => {
        if (comp.position) {
          const pos = new THREE.Vector3(
            comp.position.x,
            comp.position.y,
            comp.position.z,
          )
          box.expandByPoint(pos)
          box.expandByPoint(pos.clone().addScalar(1))
        }
      })
      return box
    }, [boardGeom, cad_components])

    useEffect(() => {
      setBoundingBox(boundingBox.isEmpty() ? null : boundingBox)
    }, [boundingBox, setBoundingBox])

    return (
      <CadViewerContainer
        ref={ref}
        autoRotateDisabled={autoRotateDisabled}
        initialCameraPosition={initialCameraPosition}
        defaultTarget={defaultTarget}
        clickToInteractEnabled={clickToInteractEnabled}
        boardDimensions={boardDimensions}
        boardCenter={boardCenter}
        onUserInteraction={onUserInteraction}
        onCameraControllerReady={onCameraControllerReady}
      >
        {boardStls.map(({ stlData, color, layerType }, index) => (
          <VisibleSTLModel
            key={`board-${index}`}
            stlData={stlData}
            color={color}
            opacity={index === 0 ? (isFauxBoard ? 0.8 : 0.95) : 1}
            layerType={layerType}
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
