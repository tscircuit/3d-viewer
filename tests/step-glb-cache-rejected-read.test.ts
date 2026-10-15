import { expect, spyOn, test } from "bun:test"
import { getCachedStepGlb } from "../src/utils/step-glb-cache"
import { replaceGlobalProperty } from "./helpers/replace-global-property"

test("treats a rejected STEP GLB cache read as a cache miss", async () => {
  const warnSpy = spyOn(console, "warn").mockImplementation(() => {})
  const restoreCaches = replaceGlobalProperty({
    propertyName: "caches",
    propertyValue: {
      open: async () => ({
        match: async () => {
          throw new Error("cache read failed")
        },
      }),
    },
  })

  try {
    await expect(
      getCachedStepGlb("https://example.com/model.step"),
    ).resolves.toBeNull()
    expect(warnSpy).toHaveBeenCalledTimes(1)
  } finally {
    warnSpy.mockRestore()
    restoreCaches()
  }
})
