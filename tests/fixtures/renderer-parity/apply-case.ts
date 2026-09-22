import type { AnyCircuitElement } from "circuit-json"
import type { comparisonCases } from "./cases"

/** Prepare a controlled diagnostic input without modifying the captured seed. */
export function applyComparisonCase(
  seed: AnyCircuitElement[],
  definition: (typeof comparisonCases)[number],
) {
  const circuit = structuredClone(seed)
  const target = circuit.find((element) => element.type === "cad_component")
  if (!target || target.type !== "cad_component")
    throw new Error(`Missing CAD fixture: ${definition.id}`)
  if (definition.rotation) target.rotation = { ...definition.rotation }
  else delete target.rotation
  if ("position" in definition) target.position = { ...definition.position }
  if ("layer" in definition && definition.layer === "bottom") {
    const pcb = circuit.find(
      (element) =>
        element.type === "pcb_component" &&
        element.pcb_component_id === target.pcb_component_id,
    )
    if (!pcb || pcb.type !== "pcb_component")
      throw new Error("Missing bottom-layer PCB owner")
    pcb.layer = "bottom"
    target.layer = "bottom"
    target.position = { ...target.position, z: -Math.abs(target.position.z) }
  }
  if (definition.explicitOrigin)
    target.model_origin_position = { x: 0, y: 0, z: 0 }
  else delete target.model_origin_position
  if ("origin" in definition)
    target.model_origin_position = { ...definition.origin }
  if ("physicalMount" in definition && definition.physicalMount) {
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
  }
  delete target.model_obj_url
  delete target.model_glb_url
  delete target.model_gltf_url
  if (definition.format === "gltf") target.model_gltf_url = "assets/myGltf.gltf"
  else if (definition.format === "glb-via-gltf")
    target.model_gltf_url = "assets/contact.glb"
  else
    target.model_obj_url =
      definition.format === "usb" ? "assets/usb.obj" : "assets/contact.obj"
  return { circuit, target }
}
