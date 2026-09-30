import { test } from "@playwright/test"
import { expectRendererAgreement, openComparison } from "./comparison-helpers"

test("M.2 M-key daughtercard seats upright in its real socket", async ({
  page,
}, testInfo) => {
  await openComparison(
    page,
    "m2-daughtercard",
    "/renderer-comparison/generated/m2-manifest.json",
  )
  await expectRendererAgreement(page, testInfo)
})
