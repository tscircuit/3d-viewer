import type { AnyCircuitElement } from "circuit-json"
import type * as THREE from "three"
import { isObjectHidden, type ObjectVisibility } from "./object-visibility"
import type { PickedSceneObject } from "./pick-scene-object"
import { getGlbComponentMetadata } from "./prerendered-glb"

/** Include unmounted CAD models and invisible GLB nodes, not just pickable meshes. */
export const getHiddenSceneObjects = (
  circuitJson: AnyCircuitElement[],
  visibility: ObjectVisibility,
  rootObject?: THREE.Object3D,
): PickedSceneObject[] => {
  const names = new Map<string, string>()
  const sourceNames = new Map(
    circuitJson.flatMap((element) =>
      element.type === "source_component"
        ? [[element.source_component_id, element.name] as const]
        : [],
    ),
  )
  for (const element of circuitJson) {
    if (element.type === "cad_component")
      names.set(
        element.cad_component_id,
        sourceNames.get(element.source_component_id) ??
          element.cad_component_id,
      )
    if (element.type === "cad_cable")
      names.set(element.cad_cable_id, element.name ?? element.cad_cable_id)
  }
  // Boards remain mounted when hidden. Traversal also finds GLB-only identities.
  rootObject?.traverse((object) => {
    const { cad_component_id, pcb_board_id, cad_cable_id } = object.userData
    const id = cad_component_id ?? pcb_board_id ?? cad_cable_id
    if (typeof id !== "string" || names.has(id)) return
    const isPanel = circuitJson.some(
      (element) => element.type === "pcb_panel" && element.pcb_panel_id === id,
    )
    names.set(
      id,
      getGlbComponentMetadata(object)?.componentName ??
        (pcb_board_id
          ? isPanel
            ? "Panel"
            : "Board"
          : (object.userData.name ?? id)),
    )
  })
  // Preserve access to explicitly hidden objects even during a renderer reload.
  for (const id of visibility.hiddenIds) {
    if (!names.has(id)) names.set(id, id)
  }
  return Array.from(names, ([objectId, name]) => ({ objectId, name })).filter(
    ({ objectId }) => isObjectHidden(visibility, objectId),
  )
}
