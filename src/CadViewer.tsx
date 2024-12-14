import type { AnySoupElement } from "@tscircuit/soup"
import { useConvertChildrenToSoup } from "./hooks/use-convert-children-to-soup"
import { su } from "@tscircuit/soup-util"
import { useEffect, useMemo, useState } from "react"
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
  children?: any
}

export const CadViewer = ({ soup, children }: Props) => {
  const [hoveredComponent, setHoveredComponent] = useState<{
    cad_component_id: string | null
    name: string | null
    mousePosition: [number, number, number] | null
  }>({
    cad_component_id: null,
    name: null,
    mousePosition: null,
  })
  soup ??= useConvertChildrenToSoup(children, soup) as any

  if (!soup) return null

  const boardGeom = useMemo(() => {
    if (!soup.some((e) => e.type === "pcb_board")) return null
    return createBoardGeomFromSoup(soup)
  }, [soup])

  const { stls: boardStls, loading } = useStlsFromGeom(boardGeom)

  const cad_components = su(soup).cad_component.list()

  return (
    <CadViewerContainer hoveredComponent={hoveredComponent}>
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
          fallback={({ error }) => <Error3d error={error} />}
        >
          <AnyCadComponent
            key={cad_component.cad_component_id}
            onHover={() => {
              setHoveredComponent({
                cad_component_id: cad_component.cad_component_id,
                name: cad_component.cad_component_id,
                mousePosition: null,
              })
            }}
            cad_component={cad_component}
            circuitJson={soup as any}
            isHovered={
              hoveredComponent.cad_component_id ===
              cad_component.cad_component_id
            }
          />
        </ThreeErrorBoundary>
      ))}
    </CadViewerContainer>
  )
}
