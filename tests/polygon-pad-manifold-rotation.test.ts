import { test } from "bun:test"
import { expectGeometryRotation } from "./fixtures/polygon-pad-rotation"

// @ts-expect-error -- The Bun runtime supports failing, but bun-types 1.2.1 omits it.
test.failing.each([90, 37])(
  "Manifold: %d° polygon copper rotates and overlapping drills stay open",
  (rotation: number) => expectGeometryRotation("manifold", rotation),
)
