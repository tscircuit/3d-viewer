import { expect, test } from "bun:test"
import { Vector3 } from "three"
import { comparisonCamera } from "../stories/renderer-comparison/geometry-capture"
import type { PreparedComparison } from "./fixtures/renderer-parity/types"

test.each([
  { fromBelow: false, view: "oblique" as const },
  { fromBelow: false, view: "side" as const },
  { fromBelow: true, view: "oblique" as const },
  { fromBelow: true, view: "side" as const },
])(
  "camera origin and direction agree for $view, fromBelow=$fromBelow",
  ({ fromBelow, view }) => {
    const fixture: PreparedComparison = {
      id: "camera",
      title: "Camera orientation",
      description: "",
      category: "control",
      targetCadId: "unused",
      circuitJson: [],
      exportMessages: [],
      camera: { target: [2, 3, -1.3], span: 4.5, fromBelow },
    }
    const camera = comparisonCamera(fixture, view)
    const direction = camera.getWorldDirection(new Vector3())
    if (fromBelow) {
      expect(camera.position.z).toBeLessThan(fixture.camera.target[2])
      expect(direction.z).toBeGreaterThan(0)
    } else {
      expect(camera.position.z).toBeGreaterThan(fixture.camera.target[2])
      expect(direction.z).toBeLessThan(0)
    }
    expect(camera.up.toArray()).toEqual([0, 0, 1])
  },
)
