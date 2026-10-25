import { test } from "bun:test"
import { expectGeometryRotation } from "./fixtures/polygon-pad-rotation"

test("manifold: 0° polygon copper rotates and overlapping drills stay open", () =>
  expectGeometryRotation("manifold", 0))
