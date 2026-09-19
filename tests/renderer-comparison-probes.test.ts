import { expect, test } from "bun:test"
import { comparisonCases } from "./fixtures/renderer-parity/cases"

test("explicit nonzero rotation probes are oblique rather than quarter turns", () => {
  let obliqueAxes = 0
  for (const fixture of comparisonCases) {
    // Physical mounting fixtures are constrained by their tabs and holes;
    // their cardinal angles are covered by a separate geometric fit test.
    if ("physicalMount" in fixture && fixture.physicalMount) continue
    if (!fixture.rotation) continue
    for (const angle of Object.values(fixture.rotation)) {
      if (angle === 0) continue
      expect(Math.abs(angle) % 90).not.toBe(0)
      obliqueAxes++
    }
  }
  expect(obliqueAxes).toBeGreaterThan(0)
})
