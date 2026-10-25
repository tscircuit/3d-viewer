import { test } from "bun:test"
import { expectDrillTransparency } from "./fixtures/polygon-pad-rotation"

// @ts-expect-error -- The Bun runtime supports failing, but bun-types 1.2.1 omits it.
test.failing.each([
  { rotation: 0, showMask: true },
  { rotation: 0, showMask: false },
  { rotation: 90, showMask: true },
  { rotation: 90, showMask: false },
  { rotation: 37, showMask: true },
  { rotation: 37, showMask: false },
])(
  "shared surface textures expose every drill at rotation=$rotation with soldermask=$showMask",
  ({ rotation, showMask }: { rotation: number; showMask: boolean }) =>
    expectDrillTransparency(rotation, showMask),
)
