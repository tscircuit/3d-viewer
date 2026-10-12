import { expect, test } from "bun:test"
import { getCachedStepGlb, setCachedStepGlb } from "../src/utils/step-glb-cache"

test("treats unavailable Cache Storage as a cache miss", async () => {
  const cachesDescriptor = Object.getOwnPropertyDescriptor(globalThis, "caches")
  Object.defineProperty(globalThis, "caches", {
    configurable: true,
    value: undefined,
  })

  try {
    expect(await getCachedStepGlb("https://example.com/model.step")).toBeNull()
    await expect(
      setCachedStepGlb(
        "https://example.com/model.step",
        new Uint8Array([1, 2, 3]).buffer,
      ),
    ).resolves.toBeUndefined()
  } finally {
    if (cachesDescriptor) {
      Object.defineProperty(globalThis, "caches", cachesDescriptor)
    } else {
      Reflect.deleteProperty(globalThis, "caches")
    }
  }
})
