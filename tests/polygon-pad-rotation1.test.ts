import { test } from "bun:test"
import { expectStoryRotation } from "./fixtures/polygon-pad-rotation"

test("0° story emits polygon-pad rotation with local outlines", () =>
  expectStoryRotation(0))
