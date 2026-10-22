import type { AnyCircuitElement } from "circuit-json"
import type * as THREE from "three"
import { pickVisibleMesh } from "./pick-visible-mesh"
import { getGlbComponentMetadata } from "./prerendered-glb"

export interface PickedCadComponent {
  cad_component_id: string
  componentName: string
}

export const pickCadComponent = (
  scene: Parameters<typeof pickVisibleMesh>[0],
  position: { x: number; y: number },
  circuitJson: AnyCircuitElement[],
): PickedCadComponent | undefined => {
  let object: THREE.Object3D | null = pickVisibleMesh(scene, position) ?? null
  while (object) {
    const cadComponentId = object.userData.cad_component_id
    if (cadComponentId) {
      const cad = circuitJson.find(
        (e) =>
          e.type === "cad_component" && e.cad_component_id === cadComponentId,
      )
      if (cad?.type !== "cad_component") {
        const metadata = getGlbComponentMetadata(object)
        if (metadata && metadata.cad_component_id === cadComponentId)
          return {
            cad_component_id: cadComponentId,
            componentName: metadata.componentName ?? cadComponentId,
          }
        return
      }
      const source = circuitJson.find(
        (e) =>
          e.type === "source_component" &&
          e.source_component_id === cad.source_component_id,
      )
      return {
        cad_component_id: cad.cad_component_id,
        componentName:
          source?.type === "source_component"
            ? source.name
            : cad.cad_component_id,
      }
    }
    object = object.parent
  }
}
