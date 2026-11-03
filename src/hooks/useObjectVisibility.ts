import { useState } from "react"
import {
  ALL_OBJECTS_VISIBLE,
  type ObjectVisibility,
} from "../utils/object-visibility"

// Keep visibility local to this viewer and circuit, including across engine switches.
export const useObjectVisibility = (circuitKey: string | ArrayBuffer) => {
  const [state, setState] = useState({
    circuitKey,
    visibility: ALL_OBJECTS_VISIBLE,
  })
  const objectVisibility =
    state.circuitKey === circuitKey ? state.visibility : ALL_OBJECTS_VISIBLE
  if (state.circuitKey !== circuitKey) {
    setState({ circuitKey, visibility: ALL_OBJECTS_VISIBLE })
  }
  const update = (next: (current: ObjectVisibility) => ObjectVisibility) => {
    setState((current) => ({
      circuitKey,
      visibility: next(
        current.circuitKey === circuitKey
          ? current.visibility
          : ALL_OBJECTS_VISIBLE,
      ),
    }))
  }
  return {
    objectVisibility,
    hideObject: (id: string) => {
      update((current) => ({
        ...current,
        hiddenIds: new Set([...current.hiddenIds, id]),
      }))
    },
    isolateObject: (id: string) => {
      update((current) => ({ ...current, isolatedId: id }))
    },
    unhideAllObjects: () => {
      update(() => ALL_OBJECTS_VISIBLE)
    },
  }
}
