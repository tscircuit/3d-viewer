import type { AnyCircuitElement } from "circuit-json"
import * as THREE from "three"
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
  if (!scene) return
  const { camera, rootObject, renderer } = scene
  const rect = renderer.domElement.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  if (
    position.x < rect.left ||
    position.x > rect.right ||
    position.y < rect.top ||
    position.y > rect.bottom
  )
    return
  const raycaster = new THREE.Raycaster()
  camera.updateWorldMatrix(true, false)
  rootObject.updateWorldMatrix(true, true)
  raycaster.setFromCamera(
    new THREE.Vector2(
      ((position.x - rect.left) / rect.width) * 2 - 1,
      -((position.y - rect.top) / rect.height) * 2 + 1,
    ),
    camera,
  )
  for (const hit of raycaster.intersectObject(rootObject, true)) {
    if (!(hit.object instanceof THREE.Mesh)) continue
    let object: THREE.Object3D | null = hit.object
    let pcbComponentId: string | undefined
    let visible = true
    while (object) {
      if (!object.visible) visible = false
      pcbComponentId ??= object.userData.pcb_component_id
      object = object.parent
    }
    if (!visible) continue
    // The closest visible surface must belong to a component. Do not pick
    // components through the board or another model.
    if (!pcbComponentId) return
    const pcb = circuitJson.find(
      (e) =>
        e.type === "pcb_component" && e.pcb_component_id === pcbComponentId,
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
}
