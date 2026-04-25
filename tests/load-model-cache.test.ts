import { expect, test, beforeEach, mock } from "bun:test"
import { clearModelCache } from "../src/utils/load-model"

// Reset cache between tests
beforeEach(() => {
  clearModelCache()
})

test("clearModelCache is exported and callable", () => {
  // Should not throw
  clearModelCache()
})

test("load3DModel cache module exports are present", async () => {
  const module = await import("../src/utils/load-model")
  expect(typeof module.load3DModel).toBe("function")
  expect(typeof module.clearModelCache).toBe("function")
})
