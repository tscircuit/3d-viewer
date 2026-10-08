import { expect, test } from "bun:test"
import { getCachedStepGlb, setCachedStepGlb } from "../src/utils/step-glb-cache"

type CacheRequestUrl = string

test("stores STEP GLB data in Cache Storage and removes the legacy entry", async () => {
  const cachesDescriptor = Object.getOwnPropertyDescriptor(globalThis, "caches")
  const localStorageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  )
  const cachedResponses = new Map<CacheRequestUrl, Response>()
  const cache = {
    match: async (request: Request) =>
      cachedResponses.get(request.url)?.clone(),
    put: async (request: Request, response: Response) => {
      cachedResponses.set(request.url, response.clone())
    },
  }
  const removedLocalStorageKeys: string[] = []
  const localStorageValues = [
    "unrelated-key",
    "step-glb-cache:v2:https://example.com/model.step",
  ]

  Object.defineProperty(globalThis, "caches", {
    configurable: true,
    value: { open: async () => cache },
  })
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      get length() {
        return localStorageValues.length
      },
      key: (index: number) => localStorageValues[index] ?? null,
      removeItem: (key: string) => {
        removedLocalStorageKeys.push(key)
        const index = localStorageValues.indexOf(key)
        if (index >= 0) localStorageValues.splice(index, 1)
      },
    },
  })

  try {
    const glb = new Uint8Array([1, 2, 3, 4]).buffer
    await setCachedStepGlb("https://example.com/model.step", glb)
    const cachedGlb = await getCachedStepGlb("https://example.com/model.step")

    expect(new Uint8Array(cachedGlb ?? new ArrayBuffer(0))).toEqual(
      new Uint8Array(glb),
    )
    expect(removedLocalStorageKeys).toEqual([
      "step-glb-cache:v2:https://example.com/model.step",
    ])
    expect(localStorageValues).toEqual(["unrelated-key"])
  } finally {
    if (cachesDescriptor) {
      Object.defineProperty(globalThis, "caches", cachesDescriptor)
    } else {
      Reflect.deleteProperty(globalThis, "caches")
    }
    if (localStorageDescriptor) {
      Object.defineProperty(globalThis, "localStorage", localStorageDescriptor)
    } else {
      Reflect.deleteProperty(globalThis, "localStorage")
    }
  }
})
