import { expect, test } from "bun:test"
import { getRoundedSmtPadDrawParams } from "../src/utils/pad-texture"

const boardOutlineBounds = {
  minX: -5,
  maxX: 5,
  minY: -2.5,
  maxY: 2.5,
  width: 10,
  height: 5,
  centerX: 0,
  centerY: 0,
}

test("getRoundedSmtPadDrawParams maps rounded rect SMT pads to texture space", () => {
  const params = getRoundedSmtPadDrawParams({
    pad: {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad1",
      shape: "rotated_rect",
      layer: "top",
      x: 0,
      y: 0,
      width: 4,
      height: 2,
      ccw_rotation: 90,
      rectBorderRadius: 0.75,
    } as any,
    boardOutlineBounds,
    canvasWidth: 1000,
    canvasHeight: 500,
  })

  expect(params).toEqual({
    centerX: 500,
    centerY: 250,
    width: 400,
    height: 200,
    radius: 75,
    rotationRadians: -Math.PI / 2,
  })
})

test("getRoundedSmtPadDrawParams ignores non-rounded SMT pads", () => {
  const params = getRoundedSmtPadDrawParams({
    pad: {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad1",
      shape: "rect",
      layer: "top",
      x: 0,
      y: 0,
      width: 4,
      height: 2,
    } as any,
    boardOutlineBounds,
    canvasWidth: 1000,
    canvasHeight: 500,
  })

  expect(params).toBeNull()
})
