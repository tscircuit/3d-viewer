import { test } from "@playwright/test"
import { expectRendererAgreement, openComparison } from "./comparison-helpers"

test("flashlight USB-C tabs and contacts align with the footprint", async ({
  page,
}, testInfo) => {
  await openComparison(page, "flashlight-native-origins")
  await expectRendererAgreement(page, testInfo)
})
