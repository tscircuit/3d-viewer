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

test("positions the initial camera outside a boardless 38x36x12.8 mm mechanical part", () => {
  const boxObj = `v -19 -18 0
v 19 -18 0
v 19 18 0
v -19 18 0
v -19 -18 12.8
v 19 -18 12.8
v 19 18 12.8
v -19 18 12.8
f 1 3 2`

  const [x, y, z] = getInitialCameraPosition({
    cadComponents: [
      {
        type: "cad_component",
        cad_component_id: "cad_1",
        pcb_component_id: "",
        source_component_id: "src_1",
        position: { x: 0, y: 0, z: 0 },
        model_obj_url: `data:text/plain,${encodeURIComponent(boxObj)}`,
        model_unit_to_mm_scale_factor: 1,
      },
    ],
  })

  const isInsidePart =
    x > -19 && x < 19 && y > -18 && y < 18 && z > 0 && z < 12.8
  expect(isInsidePart).toBe(false)
  expect(y).toBeLessThan(-18)
  expect(z).toBeGreaterThan(12.8)
})
