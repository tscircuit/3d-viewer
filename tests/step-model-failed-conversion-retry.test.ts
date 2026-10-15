import { expect, test } from "bun:test"
import {
  getOrLoadConvertedStepFile,
  type StepUrlConversionRegistry,
} from "../src/utils/get-or-load-converted-step-file"

test("retries a STEP model after a failed conversion", async () => {
  const registry: StepUrlConversionRegistry = {
    completed: new Map(),
    inProgress: new Map(),
  }
  const stepUrl = "https://example.com/model.step"

  await expect(
    getOrLoadConvertedStepFile({
      loadConvertedStepFile: () =>
        Promise.reject(new Error("conversion failed")),
      registry,
      stepUrl,
    }),
  ).rejects.toThrow("conversion failed")
  expect(registry.inProgress.size).toBe(0)
  expect(registry.completed.size).toBe(0)

  await expect(
    getOrLoadConvertedStepFile({
      loadConvertedStepFile: () =>
        Promise.resolve({ blobUrl: "blob:converted-model" }),
      registry,
      stepUrl,
    }),
  ).resolves.toEqual({ blobUrl: "blob:converted-model" })
})
