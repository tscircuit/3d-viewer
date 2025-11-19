import type { AnyCircuitElement, CadComponent } from "circuit-json"
import type { LayerVisibilityState } from "../contexts/LayerVisibilityContext"

export type ComponentType = "smd" | "through_hole" | "virtual"

export type ClassifiedCadComponent = CadComponent & {
  componentType: ComponentType
}

const getComponentIdFromElement = (element: AnyCircuitElement) => {
  if (!element || typeof element !== "object") return undefined
  const maybeComponentId =
    "pcb_component_id" in element ? element.pcb_component_id : undefined
  if (typeof maybeComponentId !== "string") return undefined
  return maybeComponentId
}

const collectComponentFootprintInfo = (circuitJson: AnyCircuitElement[]) => {
  const smtComponentIds = new Set<string>()
  const throughHoleComponentIds = new Set<string>()

  for (const element of circuitJson ?? []) {
    if (!element || typeof element !== "object") continue
    const componentId = getComponentIdFromElement(element)
    if (!componentId) continue

    if (element.type === "pcb_smtpad") {
      smtComponentIds.add(componentId)
    }

    if (element.type === "pcb_plated_hole" || element.type === "pcb_hole") {
      throughHoleComponentIds.add(componentId)
    }
  }

  return { smtComponentIds, throughHoleComponentIds }
}

const inferComponentType = (
  component: CadComponent,
  footprintInfo: ReturnType<typeof collectComponentFootprintInfo>,
): ComponentType => {
  const pcbComponentId = component.pcb_component_id
  if (!pcbComponentId) {
    return "virtual"
  }

  const hasSmt = footprintInfo.smtComponentIds.has(pcbComponentId)
  const hasThroughHole =
    footprintInfo.throughHoleComponentIds.has(pcbComponentId)

  if (hasSmt && !hasThroughHole) {
    return "smd"
  }

  if (hasThroughHole) {
    return "through_hole"
  }

  return "virtual"
}

export const classifyCadComponents = (
  circuitJson: AnyCircuitElement[] | undefined,
): ClassifiedCadComponent[] => {
  if (!circuitJson) return []
  const footprintInfo = collectComponentFootprintInfo(circuitJson)

  return (
    circuitJson.filter(
      (element): element is CadComponent => element.type === "cad_component",
    ) as CadComponent[]
  ).map((component) => ({
    ...component,
    componentType: inferComponentType(component, footprintInfo),
  }))
}

export const isComponentTypeVisible = (
  component: ClassifiedCadComponent,
  visibility: LayerVisibilityState,
) => {
  if (component.componentType === "smd") {
    return visibility.smtModels
  }
  if (component.componentType === "virtual") {
    return visibility.virtualModels
  }
  return visibility.throughHoleModels
}

export const getComponentTypeLabel = (componentType: ComponentType) => {
  switch (componentType) {
    case "smd":
      return "SMD components"
    case "virtual":
      return "Virtual components"
    default:
      return "Through-hole components"
  }
}
