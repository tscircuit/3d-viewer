import { test } from "bun:test"
import {
  expectStoryRotation,
  expectGeometryRotation,
} from "./fixtures/polygon-pad-rotation"

test("JAE stories emit rotation metadata and unrotated geometry stays open", async () => {
  for (const rotation of [0, 90, 37]) expectStoryRotation(rotation)
  for (const engine of ["jscad", "manifold"] as const)
    await expectGeometryRotation(engine, 0)
})
