import type { AnyCircuitElement } from "circuit-json"

export const getAssemblyCadComponentIds = (circuitJson: AnyCircuitElement[]) =>
  circuitJson
    .filter((element) => element.type === "cad_component")
    .filter((cad) => !cad.pcb_component_id)
    .map((cad) => cad.cad_component_id)
