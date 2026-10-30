import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, CadComponent } from "circuit-json"
import { useState } from "react"

const NO_HIDDEN_COMPONENTS: ReadonlySet<string> = new Set()

export const getVisibleCadComponents = ({
  circuitJson,
  hiddenCadComponentIds,
  hideCadComponents,
  cadComponentsDisabled,
}: {
  circuitJson: AnyCircuitElement[]
  hiddenCadComponentIds?: ReadonlySet<string>
  hideCadComponents?: boolean
  cadComponentsDisabled?: boolean
}): CadComponent[] => {
  if (hideCadComponents || cadComponentsDisabled) return []
  return su(circuitJson)
    .cad_component.list()
    .filter((cad) => !hiddenCadComponentIds?.has(cad.cad_component_id))
}

// Keep visibility local to this viewer and circuit, including across engine switches.
export const useHiddenCadComponents = (circuitKey: string | ArrayBuffer) => {
  const [state, setState] = useState({
    circuitKey,
    ids: NO_HIDDEN_COMPONENTS,
  })
  const hiddenCadComponentIds =
    state.circuitKey === circuitKey ? state.ids : NO_HIDDEN_COMPONENTS
  if (state.circuitKey !== circuitKey) {
    setState({ circuitKey, ids: NO_HIDDEN_COMPONENTS })
  }
  return {
    hiddenCadComponentIds,
    hideComponent: (id: string) => {
      setState((current) => ({
        circuitKey,
        ids: new Set([
          ...(current.circuitKey === circuitKey ? current.ids : []),
          id,
        ]),
      }))
    },
    unhideAllComponents: () => {
      setState({ circuitKey, ids: NO_HIDDEN_COMPONENTS })
    },
  }
}
