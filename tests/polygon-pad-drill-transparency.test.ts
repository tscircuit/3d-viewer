import { test } from "bun:test"
import { expectDrillTransparency } from "./fixtures/polygon-pad-rotation"

test.failing.each([
  { rotation: 0, showMask: true },
  { rotation: 0, showMask: false },
  { rotation: 90, showMask: true },
  { rotation: 90, showMask: false },
  { rotation: 37, showMask: true },
  { rotation: 37, showMask: false },
])(
  "shared surface textures expose every drill at rotation=$rotation with soldermask=$showMask",
  ({ rotation, showMask }) => expectDrillTransparency(rotation, showMask),
)
