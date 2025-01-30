import type { AnySoupElement } from "@tscircuit/soup"
import type * as React from "react"
import type * as THREE from "three"
import { su } from "@tscircuit/soup-util"
import { useState, forwardRef } from "react"
import { CadViewerContainer } from "./CadViewerContainer"
import { Pcb3D } from "./Pcb3D"

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
    point: THREE.Vector3
  }>(null)

  return (
    <CadViewerContainer ref={ref} hoveredComponent={hoveredComponent}>
      <Pcb3D
        soup={soup}
        onHover={(e) => {
          const componentName = su(soup as any).source_component.getUsing({
            source_component_id: e.cad_component.source_component_id,
          })?.name
          setHoveredComponent({
            cad_component_id: e.cad_component.cad_component_id,
            name: componentName ?? "<unknown>",
            point: e.point,
          })
        }}
        onUnhover={() => setHoveredComponent(null)}
        hoverAt={hoveredComponent?.cad_component_id}
      >
        {children}
      </Pcb3D>
    </CadViewerContainer>
  )
})
