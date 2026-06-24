import { expect, test } from "bun:test"
import { getOrCreateStepConversionFromCachedGlb } from "../src/three-components/StepModel"

test("reuses a registered STEP blob URL when the cached GLB is read again", () => {
  const originalCreateObjectUrl = URL.createObjectURL
  const createdObjectUrls: string[] = []
  const registry = {
    inProgress: new Map(),
    completed: new Map(),
  }

  URL.createObjectURL = ((blob: Blob) => {
    const objectUrl = `blob:step-cache-${createdObjectUrls.length + 1}`
    createdObjectUrls.push(`${objectUrl}:${blob.size}`)
    return objectUrl
  }) as typeof URL.createObjectURL

  try {
    const stepUrl = "https://example.com/model.step"
    const cachedGlb = new ArrayBuffer(8)

    const firstConversion = getOrCreateStepConversionFromCachedGlb(
      stepUrl,
      cachedGlb,
      registry,
    )
    const secondConversion = getOrCreateStepConversionFromCachedGlb(
      stepUrl,
      cachedGlb,
      registry,
    )

    expect(secondConversion).toBe(firstConversion)
    expect(secondConversion.blobUrl).toBe("blob:step-cache-1")
    expect(createdObjectUrls).toEqual(["blob:step-cache-1:8"])
  } finally {
    URL.createObjectURL = originalCreateObjectUrl
  }
})
