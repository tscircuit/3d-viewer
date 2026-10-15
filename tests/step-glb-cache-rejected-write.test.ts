import { expect, spyOn, test } from "bun:test"
import { setCachedStepGlb } from "../src/utils/step-glb-cache"
import { replaceGlobalProperty } from "./helpers/replace-global-property"

test("continues when Cache Storage rejects a STEP GLB write", async () => {
  const warnSpy = spyOn(console, "warn").mockImplementation(() => {})
  const restoreCaches = replaceGlobalProperty({
    propertyName: "caches",
    propertyValue: {
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
    expect(warnSpy).toHaveBeenCalledTimes(1)
  } finally {
    warnSpy.mockRestore()
    restoreCaches()
  }
})
