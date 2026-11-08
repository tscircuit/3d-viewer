import { getCircuitJsonAssemblyExplosion } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"

/**
 * Core clones its input for each pose. Keep mesh/JSCAD payloads out of that
 * input: playback only needs identities, positions, and the authored program.
 * Reattach immutable model data by reference for consumers of the full view.
 */
export function createExplosionEvaluator(assembled: AnyCircuitElement[]) {
  const motion: AnyCircuitElement[] = []
  const visible = assembled.filter(
    (element) =>
      element.type !== "cad_explosion_stage" &&
      element.type !== "cad_explosion_move",
  )
  for (const element of assembled) {
    switch (element.type) {
      case "cad_component":
        motion.push({
          type: element.type,
          cad_component_id: element.cad_component_id,
          source_component_id: element.source_component_id,
          pcb_component_id: element.pcb_component_id,
          position: element.position,
          rotation: element.rotation,
          layer: element.layer,
        })
        break
      case "cad_reference_surface":
        motion.push(element)
        break
      case "cad_explosion_stage":
      case "cad_explosion_move":
        motion.push(element)
        break
    }
  }
  return (options?: Parameters<typeof getCircuitJsonAssemblyExplosion>[1]) => {
    const view = getCircuitJsonAssemblyExplosion(motion, options)
    const positions = new Map<string, { x: number; y: number; z: number }>()
    const centers = new Map<string, { x: number; y: number; z: number }>()
    for (const element of view.circuitJson) {
      if (element.type === "cad_component")
        positions.set(element.cad_component_id, element.position)
      if (element.type === "cad_reference_surface")
        centers.set(element.cad_reference_surface_id, element.center)
    }
    return {
      ...view,
      circuitJson: visible.map((element) => {
        if (element.type === "cad_component")
          return {
            ...element,
            position: positions.get(element.cad_component_id)!,
          }
        if (element.type === "cad_reference_surface")
          return {
            ...element,
            center: centers.get(element.cad_reference_surface_id)!,
          }
        return element
      }),
    }
  }
}
