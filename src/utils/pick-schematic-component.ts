import type { AnyCircuitElement } from "circuit-json"
import type * as THREE from "three"
import { pickVisibleMesh } from "./pick-visible-mesh"
import type { ThreeContextState } from "../react-three/ThreeContext"

/** Same component identity contract as the PCB viewer. */
export interface ViewSchematicComponentEvent {
  source_component_id: string
  pcb_component_id: string
  refdes: string
}

export const pickSchematicComponent = (
  scene: Pick<ThreeContextState, "camera" | "rootObject" | "renderer"> | null,
  position: { x: number; y: number },
  circuitJson: AnyCircuitElement[],
): ViewSchematicComponentEvent | undefined => {
  let object: THREE.Object3D | null = pickVisibleMesh(scene, position) ?? null
  let pcbComponentId: string | undefined
  while (object) {
    pcbComponentId ??= object.userData.pcb_component_id
    object = object.parent
  }
  // The closest visible surface must belong to a component. Do not pick
  // components through the board or another model.
  if (!pcbComponentId) return
  const pcb = circuitJson.find(
    (e) => e.type === "pcb_component" && e.pcb_component_id === pcbComponentId,
  )
  if (pcb?.type !== "pcb_component") return
  const source = circuitJson.find(
    (e) =>
      e.type === "source_component" &&
      e.source_component_id === pcb.source_component_id,
  )
  if (source?.type !== "source_component") return
  return {
    source_component_id: source.source_component_id,
    pcb_component_id: pcb.pcb_component_id,
    refdes: source.name,
  }
}
