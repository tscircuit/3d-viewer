import { afterEach, beforeEach, expect, test } from "bun:test"
import { getCachedStepUrlConversion } from "../src/three-components/StepModel"

type ConvertedStepFile = {
  arrayBuffer: ArrayBuffer
  blobUrl: string
}

type TestRegistry = {
  inProgress: Map<string, Promise<ConvertedStepFile>>
  completed: Map<string, ConvertedStepFile>
}

const createTestRegistry = (): TestRegistry => ({
  inProgress: new Map(),
  completed: new Map(),
})

let originalCreateObjectURL: typeof URL.createObjectURL
let originalLocalStorageDescriptor: PropertyDescriptor | undefined

beforeEach(() => {
  originalCreateObjectURL = URL.createObjectURL
  originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  )

  const storage = new Map<string, string>()
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    },
  })
})

afterEach(() => {
  URL.createObjectURL = originalCreateObjectURL
  if (originalLocalStorageDescriptor) {
    Object.defineProperty(
      globalThis,
      "localStorage",
      originalLocalStorageDescriptor,
    )
  } else {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: undefined,
    })
  }
})

function cacheGlb(stepUrl: string, bytes = [1, 2, 3]) {
  localStorage.setItem(
    `step-glb-cache:${stepUrl}`,
    btoa(String.fromCharCode(...bytes)),
  )
}

test("reuses the completed STEP conversion before reading localStorage again", () => {
  const createdBlobs: Blob[] = []
  URL.createObjectURL = ((blob: Blob) => {
    createdBlobs.push(blob)
    return `blob:step-${createdBlobs.length}`
  }) as typeof URL.createObjectURL
  const registry = createTestRegistry()
  const stepUrl = "/models/repeated.step"
  cacheGlb(stepUrl)

  const firstConversion = getCachedStepUrlConversion(stepUrl, registry)
  const secondConversion = getCachedStepUrlConversion(stepUrl, registry)

  expect(firstConversion).not.toBeNull()
  expect(secondConversion).toBe(firstConversion)
  expect(firstConversion?.blobUrl).toBe("blob:step-1")
  expect(createdBlobs).toHaveLength(1)
})

test("prefers the in-memory STEP conversion over a persistent cache hit", () => {
  const createdBlobs: Blob[] = []
  URL.createObjectURL = ((blob: Blob) => {
    createdBlobs.push(blob)
    return `blob:step-${createdBlobs.length}`
  }) as typeof URL.createObjectURL
  const registry = createTestRegistry()
  const stepUrl = "/models/already-loaded.step"
  const memoryConversion = {
    arrayBuffer: new Uint8Array([9]).buffer,
    blobUrl: "blob:existing-step",
  }
  registry.completed.set(stepUrl, memoryConversion)
  cacheGlb(stepUrl, [4, 5, 6])

  const conversion = getCachedStepUrlConversion(stepUrl, registry)

  expect(conversion).toBe(memoryConversion)
  expect(createdBlobs).toHaveLength(0)
})
