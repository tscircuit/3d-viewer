import { test } from "bun:test"
import { expectGeometryRotation } from "./fixtures/polygon-pad-rotation"

// @ts-expect-error -- The Bun runtime supports failing, but bun-types 1.2.1 omits it.
test.failing("JSCAD rotates polygon copper and keeps overlapping drills open", async () => {
  for (const rotation of [90, 37]) {
    await expectGeometryRotation("jscad", rotation)
  }
}, 15_000)
