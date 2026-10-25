import { test } from "bun:test"
import { expectStoryRotation } from "./fixtures/polygon-pad-rotation"

test("90° story emits polygon-pad rotation with local outlines", () =>
  expectStoryRotation(90))
