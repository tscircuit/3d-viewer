import type { AnyCircuitElement } from "circuit-json"

/** Retain the existing numeric USB mounting regression; not used by stories. */
export function applyUsbMountingFixture(seed: AnyCircuitElement[]) {
  const circuit = structuredClone(seed)
  const target = circuit.find((element) => element.type === "cad_component")
  if (!target || target.type !== "cad_component")
    throw new Error("Missing USB CAD fixture")
  target.rotation = { x: 0, y: 0, z: 270 }
  target.position = { x: 1.3824742, y: 0, z: 1.975 }
  target.model_origin_position = { x: 0, y: 0, z: 0 }
  const slots = circuit.filter(
    (element) =>
      element.type === "pcb_plated_hole" &&
      element.shape === "pill" &&
      element.pcb_component_id === target.pcb_component_id,
  )
  if (slots.length !== 2)
    throw new Error("USB mounting fixture must have two pill slots")
  for (const slot of slots) {
    if (slot.type !== "pcb_plated_hole" || slot.shape !== "pill")
      throw new Error("Invalid mounting slot")
    slot.ccw_rotation = 90
  }
  return { circuit, target }
}
