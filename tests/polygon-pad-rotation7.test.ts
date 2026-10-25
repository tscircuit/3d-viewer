import { test } from "bun:test"
import { expectGeometryRotation } from "./fixtures/polygon-pad-rotation"

test.failing("jscad: 90° polygon copper rotates and overlapping drills stay open", () =>
  expectGeometryRotation("jscad", 90))
