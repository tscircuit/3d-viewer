import { expect, test } from "bun:test"
import { setCachedStepGlb } from "../src/utils/step-glb-cache"

test("continues when Cache Storage rejects a STEP GLB write", async () => {
  const cachesDescriptor = Object.getOwnPropertyDescriptor(globalThis, "caches")
  Object.defineProperty(globalThis, "caches", {
    configurable: true,
    value: {
      open: async () => ({
        put: async () => {
          throw new Error("quota exceeded")
        },
      }),
    },
  })

  try {
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
