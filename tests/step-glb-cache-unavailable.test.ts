import { expect, test } from "bun:test"
import { getCachedStepGlb, setCachedStepGlb } from "../src/utils/step-glb-cache"
import { replaceGlobalProperty } from "./helpers/replace-global-property"

test("continues when Cache Storage is unavailable", async () => {
  const restoreCaches = replaceGlobalProperty({
    propertyName: "caches",
    propertyValue: undefined,
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
    restoreCaches()
  }
})
