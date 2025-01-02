import type { AnySoupElement } from "@tscircuit/soup"
import type * as React from "react"
import type * as THREE from "three"
import { useConvertChildrenToSoup } from "./hooks/use-convert-children-to-soup"
import { su } from "@tscircuit/soup-util"
import { useEffect, useMemo, useState, forwardRef } from "react"
import { createBoardGeomFromSoup } from "./soup-to-3d"
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
  soup?: AnySoupElement[]
}

export const CadViewer = forwardRef<
  THREE.Object3D,
  React.PropsWithChildren<Props>
>(({ soup, children }, ref) => {
  const [hoveredComponent, setHoveredComponent] = useState<null | {
    cad_component_id: string
    name: string
    mousePosition: [number, number, number]
  }>(null)
  soup ??= useConvertChildrenToSoup(children, soup) as any

  if (!soup) return null

  const boardGeom = useMemo(() => {
    if (!soup.some((e) => e.type === "pcb_board")) return null
    return createBoardGeomFromSoup(soup)
  }, [soup])

  const { stls: boardStls, loading } = useStlsFromGeom(boardGeom)

  const cad_components = su(soup).cad_component.list()

  return (
    <CadViewerContainer ref={ref} hoveredComponent={hoveredComponent}>
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
            onHover={(e) => {
              // TODO this should be done by onUnhover
              if (!e) {
                setHoveredComponent(null)
              }
              if (!e.mousePosition) return

              const componentName = su(soup as any).source_component.getUsing({
                source_component_id: cad_component.source_component_id,
              })?.name
              setHoveredComponent({
                cad_component_id: cad_component.cad_component_id,
                name: componentName ?? "<unknown>",
                mousePosition: e.mousePosition,
              })
            }}
            cad_component={cad_component}
            isHovered={
              hoveredComponent?.cad_component_id ===
              cad_component.cad_component_id
            }
          />
        </ThreeErrorBoundary>
      ))}
    </CadViewerContainer>
  )
})
