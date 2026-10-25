import { test } from "bun:test"
import { expectDrillTransparency } from "./fixtures/polygon-pad-rotation"

// @ts-expect-error -- The Bun runtime supports failing, but bun-types 1.2.1 omits it.
test.failing("shared surface textures expose every drill at 0°, 90°, and 37° with mask shown and hidden", () => {
  for (const rotation of [0, 90, 37]) {
    for (const showMask of [true, false])
      expectDrillTransparency(rotation, showMask)
  }
}, 15_000)
