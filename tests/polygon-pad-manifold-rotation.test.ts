import { test } from "bun:test"
import { expectGeometryRotation } from "./fixtures/polygon-pad-rotation"

test.failing.each([90, 37])(
  "Manifold: %d° polygon copper rotates and overlapping drills stay open",
  (rotation) => expectGeometryRotation("manifold", rotation),
)
