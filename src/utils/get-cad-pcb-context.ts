import type {
  AnyCircuitElement,
  CadComponent,
  PcbComponent,
} from "circuit-json"

/** A missing PCB reference denotes mechanical CAD, even when another PCB
 * component has the same source ID. Unowned holes must not classify it as THT.
 */
export const getCadPcbContext = (
  cad: CadComponent,
  circuitJson: AnyCircuitElement[],
) => {
  const pcbComponent = cad.pcb_component_id
    ? circuitJson.find(
        (element): element is PcbComponent =>
          element.type === "pcb_component" &&
          element.pcb_component_id === cad.pcb_component_id,
      )
    : undefined
  return {
    pcbComponent,
    layer: cad.layer ?? pcbComponent?.layer ?? "top",
    isThroughHole: Boolean(
      pcbComponent &&
        circuitJson.some(
          (element) =>
            element.type === "pcb_plated_hole" &&
            element.pcb_component_id === pcbComponent.pcb_component_id,
        ),
    ),
  }
}
