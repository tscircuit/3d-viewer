import { expect, test } from "bun:test"
import { getInitialCameraPosition } from "../src/utils/get-initial-camera-position"

test("positions the initial camera relative to an off-origin board", () => {
  const boardDimensions = { width: 86.4, height: 54.6 }
  const centeredCameraPosition = getInitialCameraPosition({
    boardDimensions,
    boardCenter: { x: 0, y: 0 },
  })
  const offOriginCameraPosition = getInitialCameraPosition({
    boardDimensions,
    boardCenter: { x: 417, y: 293 },
  })

  expect(offOriginCameraPosition[0] - 417).toBeCloseTo(
    centeredCameraPosition[0],
  )
  expect(offOriginCameraPosition[1] - 293).toBeCloseTo(
    centeredCameraPosition[1],
  )
  expect(offOriginCameraPosition[2]).toBeCloseTo(centeredCameraPosition[2])
})
