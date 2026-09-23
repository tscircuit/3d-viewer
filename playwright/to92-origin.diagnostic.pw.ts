import { test } from "@playwright/test"
import { expectRendererAgreement, openComparison } from "./comparison-helpers"

test("TO-92 native STEP leads align with the three holes", async ({
  page,
}, testInfo) => {
  await openComparison(page, "to92-native-origin")
  await expectRendererAgreement(page, testInfo)
})
