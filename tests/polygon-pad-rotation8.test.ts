import { test } from "bun:test"
import { expectGeometryRotation } from "./fixtures/polygon-pad-rotation"

test.failing("manifold: 90° polygon copper rotates and overlapping drills stay open", () =>
  expectGeometryRotation("manifold", 90))
