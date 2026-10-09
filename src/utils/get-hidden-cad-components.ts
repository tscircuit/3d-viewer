import type { AnyCircuitElement, CadComponent } from "circuit-json"
import type { PickedCadComponent } from "./pick-cad-component"

type SourceComponentId = Extract<
  AnyCircuitElement,
  { type: "source_component" }
>["source_component_id"]

export const getHiddenCadComponents = ({
  circuitJson,
  hiddenCadComponentIds,
}: {
  circuitJson: AnyCircuitElement[]
  hiddenCadComponentIds: ReadonlySet<string>
}): PickedCadComponent[] => {
  const sourceNames = new Map<SourceComponentId, string>()
  for (const element of circuitJson) {
    if (element.type === "source_component") {
      sourceNames.set(element.source_component_id, element.name)
    }
  }
  return circuitJson
    .filter(
      (element): element is CadComponent =>
        element.type === "cad_component" &&
        hiddenCadComponentIds.has(element.cad_component_id),
    )
    .map((cad) => ({
      cad_component_id: cad.cad_component_id,
      componentName:
        (cad.source_component_id
          ? sourceNames.get(cad.source_component_id)
          : undefined) ?? cad.cad_component_id,
    }))
}
