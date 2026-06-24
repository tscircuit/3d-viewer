import { afterEach, beforeEach, expect, test } from "bun:test"
import {
  arrayBufferToBase64,
  getCachedConvertedStepFile,
  STEP_GLB_CACHE_PREFIX,
  type StepUrlConversionRegistry,
} from "../src/utils/step-model-cache"

class MemoryStorage {
  private items = new Map<string, string>()

  getItem(key: string): string | null {
    return this.items.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value)
  }
}

const originalLocalStorage = globalThis.localStorage
const originalCreateObjectUrl = URL.createObjectURL
let createObjectUrlCount = 0

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: new MemoryStorage(),
  })
  createObjectUrlCount = 0
  URL.createObjectURL = (() => {
    createObjectUrlCount += 1
    return `blob:step-model-${createObjectUrlCount}`
  }) as typeof URL.createObjectURL
})

afterEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: originalLocalStorage,
  })
  URL.createObjectURL = originalCreateObjectUrl
})

function createRegistry(): StepUrlConversionRegistry {
  return {
    inProgress: new Map(),
    completed: new Map(),
  }
}

test("reuses completed STEP conversions before reading saved GLB cache", () => {
  const stepUrl = "/models/chip.step"
  const registry = createRegistry()
  const existingConverted = {
    arrayBuffer: new Uint8Array([4, 5, 6]).buffer,
    blobUrl: "blob:existing-step-model",
  }
  registry.completed.set(stepUrl, existingConverted)
  localStorage.setItem(
    `${STEP_GLB_CACHE_PREFIX}${stepUrl}`,
    arrayBufferToBase64(new Uint8Array([1, 2, 3]).buffer),
  )

  const converted = getCachedConvertedStepFile(stepUrl, registry)

  expect(converted).toBe(existingConverted)
  expect(createObjectUrlCount).toBe(0)
})

test("hydrates one reusable converted STEP file from saved GLB cache", () => {
  const stepUrl = "/models/chip.step"
  const registry = createRegistry()
  localStorage.setItem(
    `${STEP_GLB_CACHE_PREFIX}${stepUrl}`,
    arrayBufferToBase64(new Uint8Array([1, 2, 3]).buffer),
  )

  const firstConverted = getCachedConvertedStepFile(stepUrl, registry)
  const secondConverted = getCachedConvertedStepFile(stepUrl, registry)

  if (!firstConverted) {
    throw new Error("Expected saved STEP GLB cache to hydrate a converted file")
  }

  expect(firstConverted.blobUrl).toBe("blob:step-model-1")
  expect(secondConverted).toBe(firstConverted)
  expect(registry.completed.get(stepUrl)).toBe(firstConverted)
  expect(createObjectUrlCount).toBe(1)
})
