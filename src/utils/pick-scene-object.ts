import type { AnyCircuitElement } from "circuit-json"
import type * as THREE from "three"
import { pickVisibleMesh } from "./pick-visible-mesh"
import { getGlbComponentMetadata } from "./prerendered-glb"

export interface PickedSceneObject {
  /** cad_component_id, cad_cable_id, or the rendered pcb_board_id/pcb_panel_id */
  objectId: string
  name: string
}

const getBoardName = (id: string, circuitJson: AnyCircuitElement[]) =>
  circuitJson.some((e) => e.type === "pcb_panel" && e.pcb_panel_id === id)
    ? "Panel"
    : "Board"

export const pickSceneObject = (
  scene: Parameters<typeof pickVisibleMesh>[0],
  position: { x: number; y: number },
  circuitJson: AnyCircuitElement[],
): PickedSceneObject | undefined => {
  let object: THREE.Object3D | null = pickVisibleMesh(scene, position) ?? null
  while (object) {
    const {
      cad_component_id: cadComponentId,
      pcb_board_id: pcbBoardId,
      cad_cable_id: cadCableId,
    } = object.userData
    if (cadComponentId) {
      const cad = circuitJson.find(
        (e) =>
          e.type === "cad_component" && e.cad_component_id === cadComponentId,
      )
      if (cad?.type !== "cad_component") {
        const metadata = getGlbComponentMetadata(object)
        if (metadata && metadata.cad_component_id === cadComponentId)
          return {
            objectId: cadComponentId,
            name: metadata.componentName ?? cadComponentId,
          }
        return
      }
      const source = circuitJson.find(
        (e) =>
          e.type === "source_component" &&
          e.source_component_id === cad.source_component_id,
      )
      return {
        objectId: cad.cad_component_id,
        name:
          source?.type === "source_component"
            ? source.name
            : cad.cad_component_id,
      }
    }
    if (pcbBoardId)
      return {
        objectId: pcbBoardId,
        name: getBoardName(pcbBoardId, circuitJson),
      }
    if (cadCableId)
      return { objectId: cadCableId, name: object.userData.name ?? cadCableId }
    object = object.parent
  }
}
