import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement } from "circuit-json"
import type * as React from "react"
import { forwardRef, useMemo } from "react"
import type * as THREE from "three"
import { AnyCadComponent } from "./AnyCadComponent"
import { CadViewerContainer } from "./CadViewerContainer"
import type { CameraController } from "./hooks/cameraAnimation"
import { useConvertChildrenToCircuitJson } from "./hooks/use-convert-children-to-soup"
import { useStlsFromGeom } from "./hooks/use-stls-from-geom"
import { useBoardGeomBuilder } from "./hooks/useBoardGeomBuilder"
import { usePcbThickness } from "./hooks/usePcbThickness"
import type { ReferenceObjectType } from "./reference-objects/reference-object"
import { CadCable, getCadCables } from "./three-components/CadCable"
import { Error3d } from "./three-components/Error3d"
import { JscadBoardTextures } from "./three-components/JscadBoardTextures"
import { ThreeErrorBoundary } from "./three-components/ThreeErrorBoundary"
import { VisibleSTLModel } from "./three-components/VisibleSTLModel"
import { getInitialCameraPosition } from "./utils/get-initial-camera-position"
import { calculateOutlineBounds } from "./utils/outline-bounds"
import { addFauxBoardIfNeeded } from "./utils/preprocess-circuit-json"

interface Props {
  /**
   * @deprecated Use circuitJson instead.
   */
  soup?: AnyCircuitElement[]
  circuitJson?: AnyCircuitElement[]
  autoRotateDisabled?: boolean
  clickToInteractEnabled?: boolean
  cameraType?: "orthographic" | "perspective"
  onUserInteraction?: () => void
  onCameraControllerReady?: (controller: CameraController | null) => void
  resolveStaticAsset?: (modelUrl: string) => string
  referenceObject?: ReferenceObjectType | null
  hiddenCadComponentIds?: ReadonlySet<string>
}

export const CadViewerJscad = forwardRef<
  THREE.Object3D,
  React.PropsWithChildren<Props>
>(
  (
    {
      circuitJson,
      children,
      autoRotateDisabled,
      clickToInteractEnabled,
      onUserInteraction,
      onCameraControllerReady,
      resolveStaticAsset,
      referenceObject,
      hiddenCadComponentIds,
    },
    ref,
  ) => {
    const childrenSoup = useConvertChildrenToCircuitJson(children)
    const internalCircuitJson = useMemo(() => {
      return addFauxBoardIfNeeded(
        circuitJson ?? childrenSoup,
      ) as AnyCircuitElement[]
    }, [circuitJson, childrenSoup])

    // Use the new hook to manage board geometry building
    const boardGeom = useBoardGeomBuilder(internalCircuitJson)

    const isFauxBoard = useMemo(() => {
      if (!internalCircuitJson) return false
      try {
        const board = su(internalCircuitJson).pcb_board.list()[0]
        return !!board && board.pcb_board_id === "faux-board"
      } catch (e) {
        return false
      }
    }, [internalCircuitJson])

    const boardDimensions = useMemo(() => {
      if (!internalCircuitJson) return undefined
      try {
        const board = su(internalCircuitJson).pcb_board.list()[0]
        if (!board) return undefined
        const bounds = calculateOutlineBounds(board)
        return { width: bounds.width, height: bounds.height }
      } catch (e) {
        console.error(e)
        return undefined
      }
    }, [internalCircuitJson])

    const boardCenter = useMemo(() => {
      if (!internalCircuitJson) return undefined
      try {
        const board = su(internalCircuitJson).pcb_board.list()[0]
        if (!board) return undefined
        const bounds = calculateOutlineBounds(board)
        return { x: bounds.centerX, y: bounds.centerY }
      } catch (e) {
        console.error(e)
        return undefined
      }
    }, [internalCircuitJson])

    const cameraSessionScope = useMemo(() => {
      if (!internalCircuitJson) return undefined
      const board = su(internalCircuitJson).pcb_board.list()[0]
      if (!board) return undefined
      return JSON.stringify({
        pcbBoardId: board.pcb_board_id,
        center: boardCenter,
        dimensions: boardDimensions,
      })
    }, [internalCircuitJson, boardCenter, boardDimensions])

    const cad_components = useMemo(
      () =>
        su(internalCircuitJson)
          .cad_component.list()
          .filter((cad) => !hiddenCadComponentIds?.has(cad.cad_component_id)),
      [internalCircuitJson, hiddenCadComponentIds],
    )

    const initialCameraPosition = useMemo(() => {
      return getInitialCameraPosition({
        boardDimensions,
        boardCenter,
        cadComponents: cad_components,
      })
    }, [boardDimensions, boardCenter, cad_components])

    const pcbThickness = usePcbThickness(internalCircuitJson)

    // Use the state `boardGeom` which starts simplified and gets updated
    const { stls: boardStls, loading } = useStlsFromGeom(boardGeom)
    const cadCables = getCadCables(internalCircuitJson)

    return (
      <CadViewerContainer
        ref={ref}
        autoRotateDisabled={autoRotateDisabled}
        initialCameraPosition={initialCameraPosition}
        clickToInteractEnabled={clickToInteractEnabled}
        boardDimensions={boardDimensions}
        boardCenter={boardCenter}
        cameraSessionScope={cameraSessionScope}
        referenceObject={referenceObject}
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
        <JscadBoardTextures
          circuitJson={internalCircuitJson}
          pcbThickness={pcbThickness}
          isFaux={isFauxBoard}
        />
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
              resolveStaticAsset={resolveStaticAsset}
            />
          </ThreeErrorBoundary>
        ))}
        {cadCables.map((cable) => (
          <CadCable key={cable.cad_cable_id} cable={cable} />
        ))}
      </CadViewerContainer>
    )
  },
)
