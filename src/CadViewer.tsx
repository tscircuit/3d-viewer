import type { AnySoupElement } from "@tscircuit/soup"
import { useConvertChildrenToSoup } from "./hooks/use-convert-children-to-soup"
import { su } from "@tscircuit/soup-util"
import { useMemo } from "react"
import { createBoardGeomFromSoup } from "./soup-to-3d"
import { useStlsFromGeom } from "./hooks/use-stls-from-geom"
import { STLModel } from "./three-components/STLModel"
import { CadViewerContainer } from "./CadViewerContainer"
import { MixedStlModel } from "./three-components/MixedStlModel"
import { Euler } from "three"
import { JscadModel } from "./three-components/JscadModel"
import { Footprinter3d } from "jscad-electronics"
import { FootprinterModel } from "./three-components/FootprinterModel"

interface Props {
  soup?: AnySoupElement[]
  children?: any
}

export const CadViewer = ({ soup, children }: Props) => {
  soup ??= useConvertChildrenToSoup(children, soup) as any

  if (!soup) return null

  const boardGeom = useMemo(() => {
    if (!soup.some((e) => e.type === "pcb_board")) return null
    return createBoardGeomFromSoup(soup)
  }, [soup])

  const { stls, loading } = useStlsFromGeom(boardGeom)

  const cad_components = su(soup).cad_component.list()

  // TODO canvas/camera etc.
  return (
    <CadViewerContainer>
      {stls.map(({ stlUrl, color }, index) => (
        <STLModel
          key={stlUrl}
          stlUrl={stlUrl}
          color={color}
          opacity={index === 0 ? 0.95 : 1}
        />
      ))}
      {cad_components.map((cad_component) => {
        const url = cad_component.model_obj_url ?? cad_component.model_stl_url
        if (url) {
          return (
            <MixedStlModel
              key={cad_component.cad_component_id}
              url={url}
              position={
                cad_component.position
                  ? [
                      cad_component.position.x,
                      cad_component.position.y,
                      cad_component.position.z,
                    ]
                  : undefined
              }
              rotation={
                cad_component.rotation
                  ? new Euler(
                      (cad_component.rotation.x * Math.PI) / 180,
                      (cad_component.rotation.y * Math.PI) / 180,
                      (cad_component.rotation.z * Math.PI) / 180,
                    )
                  : undefined
              }
            />
          )
        }

        if (cad_component.model_jscad) {
          return (
            <JscadModel
              key={cad_component.cad_component_id}
              jscadPlan={cad_component.model_jscad as any}
            />
          )
        }

        if (cad_component.footprinter_string) {
          return (
            <FootprinterModel
              positionOffset={
                cad_component.position
                  ? [
                      cad_component.position.x,
                      cad_component.position.y,
                      cad_component.position.z,
                    ]
                  : undefined
              }
              footprint={cad_component.footprinter_string}
            />
          )
        }
      })}
    </CadViewerContainer>
  )
}
