import { expect, test } from "bun:test"
import {
  ENCLOSURE_VISIBILITY_CYCLE,
  nextEnclosureVisibility,
} from "../src/contexts/LayerVisibilityContext"

/** One assembled enclosure needs hidden, see-through and print-inspection modes. */
test("enclosure appearance cycles from translucent through every state", () => {
  expect(ENCLOSURE_VISIBILITY_CYCLE).toEqual([
    "translucent",
    "opaque",
    "hidden",
  ])

  let current = ENCLOSURE_VISIBILITY_CYCLE[0]!
  for (let i = 0; i < ENCLOSURE_VISIBILITY_CYCLE.length; i++) {
    current = nextEnclosureVisibility(current)
  }
  expect(current).toBe("translucent")
  expect(nextEnclosureVisibility("unknown" as any)).toBe("translucent")
})
