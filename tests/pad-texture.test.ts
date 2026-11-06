import { expect, test } from "bun:test"
import "bun-match-svg"
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

test("renders rounded rect and rotated_rect SMT pads snapshot", async () => {
  const canvasWidth = 600
  const canvasHeight = 300
  const pads = [
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rect",
      shape: "rect",
      layer: "top",
      x: -2.5,
      y: 0,
      width: 3,
      height: 2,
      rect_border_radius: 0.5,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rotated_rect",
      shape: "rotated_rect",
      layer: "top",
      x: 2.2,
      y: 0,
      width: 3,
      height: 1.8,
      ccw_rotation: 35,
      rectBorderRadius: 0.45,
    },
  ] as any[]

  const padSvgs = pads
    .map((pad) =>
      getRoundedSmtPadDrawParams({
        pad,
        boardOutlineBounds,
        canvasWidth,
        canvasHeight,
      }),
    )
    .filter((params): params is NonNullable<typeof params> => params !== null)
    .map((params) => {
      const deg = (params.rotationRadians * 180) / Math.PI
      return `<g transform="translate(${params.centerX} ${params.centerY}) rotate(${deg.toFixed(2)})"><rect x="${-params.width / 2}" y="${-params.height / 2}" width="${params.width}" height="${params.height}" rx="${params.radius}" ry="${params.radius}" fill="#d4a359" stroke="#8a5a19" stroke-width="2" /></g>`
    })
    .join("\n  ")

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="${canvasWidth}" height="${canvasHeight}">
  <rect width="${canvasWidth}" height="${canvasHeight}" rx="12" fill="#146e37" />
  ${padSvgs}
</svg>`

  await expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "smtpad-rect-border-radius",
  )
})
