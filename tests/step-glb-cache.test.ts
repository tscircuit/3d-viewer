import { expect, test } from "bun:test"
import type { StepModelUrl } from "../src/utils/get-or-load-converted-step-file"
import { getCachedStepGlb, setCachedStepGlb } from "../src/utils/step-glb-cache"
import { replaceGlobalProperty } from "./helpers/replace-global-property"

function getCacheRequestUrl(request: RequestInfo | URL): StepModelUrl {
  if (typeof request === "string") return request
  if (request instanceof URL) return request.href
  return request.url
}

test("stores converted STEP GLBs as binary cache responses", async () => {
  const cacheEntries = new Map<StepModelUrl, Response>()
  const removedLegacyKeys: string[] = []
  const restoreCaches = replaceGlobalProperty({
    propertyName: "caches",
    propertyValue: {
      open: async () => ({
        match: async (request: RequestInfo | URL) =>
          cacheEntries.get(getCacheRequestUrl(request))?.clone(),
        put: async (request: RequestInfo | URL, response: Response) => {
          cacheEntries.set(getCacheRequestUrl(request), response.clone())
        },
      }),
    },
  })
  const restoreLocalStorage = replaceGlobalProperty({
    propertyName: "localStorage",
    propertyValue: {
      get length() {
        return 1
      },
      key: () => "step-glb-cache:v2:https://example.com/model.step",
      removeItem: (cacheKey: string) => removedLegacyKeys.push(cacheKey),
    },
  })

  try {
    const stepUrl = "https://example.com/model.step"
    const convertedGlb = new Uint8Array([0, 1, 2, 255]).buffer

    await setCachedStepGlb(stepUrl, convertedGlb)
    const cachedGlb = await getCachedStepGlb(stepUrl)

    if (!cachedGlb) throw new Error("Expected cached STEP GLB")
    expect(new Uint8Array(cachedGlb)).toEqual(new Uint8Array(convertedGlb))
    expect(removedLegacyKeys).toEqual([
      "step-glb-cache:v2:https://example.com/model.step",
    ])
  } finally {
    restoreLocalStorage()
    restoreCaches()
  }
})
