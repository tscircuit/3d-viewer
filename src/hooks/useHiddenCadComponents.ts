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
    hideComponents: (ids: Iterable<string>) => {
      setState((current) => {
        const hiddenIds = new Set<string>()
        if (current.circuitKey === circuitKey) {
          for (const id of current.ids) hiddenIds.add(id)
        }
        for (const id of ids) hiddenIds.add(id)
        return { circuitKey, ids: hiddenIds }
      })
    },
    unhideAllComponents: () => {
      setState({ circuitKey, ids: NO_HIDDEN_COMPONENTS })
    },
    showComponents: (ids: Iterable<string>) => {
      setState((current) => {
        if (current.circuitKey !== circuitKey) {
          return { circuitKey, ids: NO_HIDDEN_COMPONENTS }
        }
        const hiddenIds = new Set(current.ids)
        for (const id of ids) hiddenIds.delete(id)
        return { circuitKey, ids: hiddenIds }
      })
    },
  }
}
