import { expect, test } from "bun:test"
import {
  type ConvertedStepFile,
  getOrLoadConvertedStepFile,
  type StepUrlConversionRegistry,
} from "../src/utils/get-or-load-converted-step-file"

test("deduplicates concurrent conversion of one STEP model", async () => {
  const registry: StepUrlConversionRegistry = {
    completed: new Map(),
    inProgress: new Map(),
  }
  const { promise: pendingConversion, resolve: resolveConversion } =
    Promise.withResolvers<ConvertedStepFile>()
  let conversionCount = 0
  const loadConvertedStepFile = () => {
    conversionCount += 1
    return pendingConversion
  }

  const firstLoad = getOrLoadConvertedStepFile({
    loadConvertedStepFile,
    registry,
    stepUrl: "https://example.com/model.step",
  })
  const secondLoad = getOrLoadConvertedStepFile({
    loadConvertedStepFile,
    registry,
    stepUrl: "https://example.com/model.step",
  })

  expect(secondLoad).toBe(firstLoad)
  expect(conversionCount).toBe(1)
  resolveConversion({ blobUrl: "blob:converted-model" })
  await expect(firstLoad).resolves.toEqual({ blobUrl: "blob:converted-model" })
  expect(registry.inProgress.size).toBe(0)
  expect(registry.completed.get("https://example.com/model.step")).toEqual({
    blobUrl: "blob:converted-model",
  })
})
