import { expect, test } from "bun:test"
import {
  type ConvertedStepFile,
  getOrLoadConvertedStepFile,
  type StepUrlConversionRegistry,
} from "../src/utils/get-or-load-converted-step-file"

interface ConversionLoadState {
  loadCount: number
  pendingConversion: Promise<ConvertedStepFile>
}

async function loadPendingConversion(
  conversionLoadState: ConversionLoadState,
): Promise<ConvertedStepFile> {
  conversionLoadState.loadCount += 1
  return conversionLoadState.pendingConversion
}

test("deduplicates concurrent conversion of one STEP model", async () => {
  const registry: StepUrlConversionRegistry = {
    completed: new Map(),
    inProgress: new Map(),
  }
  const { promise: pendingConversion, resolve: resolveConversion } =
    Promise.withResolvers<ConvertedStepFile>()
  const conversionLoadState: ConversionLoadState = {
    loadCount: 0,
    pendingConversion,
  }
  const loadConvertedStepFile = loadPendingConversion.bind(
    undefined,
    conversionLoadState,
  )

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
  expect(conversionLoadState.loadCount).toBe(1)
  resolveConversion({ blobUrl: "blob:converted-model" })
  await expect(firstLoad).resolves.toEqual({ blobUrl: "blob:converted-model" })
  expect(registry.inProgress.size).toBe(0)
  expect(registry.completed.get("https://example.com/model.step")).toEqual({
    blobUrl: "blob:converted-model",
  })
})
