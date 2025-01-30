import type { CadComponent } from "circuit-json"
import type { HoverProps } from "./ContainerWithTooltip"
import { MixedStlModel } from "./three-components/MixedStlModel"
import { JscadModel } from "./three-components/JscadModel"
import { FootprinterModel } from "./three-components/FootprinterModel"
import { tuple } from "./utils/tuple"

export type * as tooltip from "./ContainerWithTooltip"

export function AnyCadComponent({
  cad_component,
  onHover = () => {},
  onUnhover = () => {},
  isHovered = false,
}: HoverProps & { cad_component: CadComponent }) {
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
        onUnhover={onUnhover}
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
        onUnhover={onUnhover}
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
        onUnhover={onUnhover}
        isHovered={isHovered}
      />
    )
  }
}
