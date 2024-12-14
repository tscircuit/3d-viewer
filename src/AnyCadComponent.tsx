import type { AnyCircuitElement, CadComponent } from "circuit-json"
import { useConvertChildrenToSoup } from "./hooks/use-convert-children-to-soup"
import { su } from "@tscircuit/soup-util"
import { useMemo, useState } from "react"
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

export const AnyCadComponent = ({
  cad_component,
  onHover = () => {},
  isHovered = false,
}: {
  cad_component: CadComponent
  onHover?: (e: any) => void
  isHovered?: boolean
}) => {
  const url = cad_component.model_obj_url ?? cad_component.model_stl_url
  const rotationOffset = cad_component.rotation
    ? tuple(
        (cad_component.rotation.x * Math.PI) / 180,
        (cad_component.rotation.y * Math.PI) / 180,
        (cad_component.rotation.z * Math.PI) / 180,
      )
    : undefined

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
        rotation={rotationOffset}
        onHover={onHover}
        isHovered={isHovered}
      />
    )
  }

  if (cad_component.model_jscad) {
    return (
      <JscadModel
        key={cad_component.cad_component_id}
        jscadPlan={cad_component.model_jscad as any}
        rotationOffset={rotationOffset}
        onHover={onHover}
        isHovered={isHovered}
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
        rotationOffset={rotationOffset}
        footprint={cad_component.footprinter_string}
        onHover={onHover}
        isHovered={isHovered}
      />
    )
  }
}
