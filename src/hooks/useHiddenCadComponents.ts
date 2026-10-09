import { useState } from "react"

const NO_HIDDEN_COMPONENTS: ReadonlySet<string> = new Set()

// Keep visibility local to this viewer and circuit, including across engine switches.
export const useHiddenCadComponents = (circuitKey: string) => {
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
