import type { PcbSmtPad } from "circuit-json"
import {
  clampRectBorderRadius,
  extractRectBorderRadius,
} from "./rect-border-radius"

const RECT_PAD_SEGMENTS = 64

export function createRoundedRectPrism({
  Manifold,
  width,
  height,
  thickness,
  borderRadius,
}: {
  Manifold: any
  width: number
  height: number
  thickness: number
  borderRadius?: number | null
}) {
  const clampedRadius = clampRectBorderRadius(width, height, borderRadius)

  if (clampedRadius <= 0) {
    return Manifold.cube([width, height, thickness], true)
  }

  const shapes: any[] = []
  const innerWidth = width - 2 * clampedRadius
  const innerHeight = height - 2 * clampedRadius

  if (innerWidth > 0) {
    shapes.push(Manifold.cube([innerWidth, height, thickness], true))
  }

  if (innerHeight > 0) {
    shapes.push(Manifold.cube([width, innerHeight, thickness], true))
  }

  const cornerOffsets = [
    [width / 2 - clampedRadius, height / 2 - clampedRadius],
    [-width / 2 + clampedRadius, height / 2 - clampedRadius],
    [-width / 2 + clampedRadius, -height / 2 + clampedRadius],
    [width / 2 - clampedRadius, -height / 2 + clampedRadius],
  ]

  cornerOffsets.forEach(([x, y]) => {
    shapes.push(
      Manifold.cylinder(
        thickness,
        clampedRadius,
        clampedRadius,
        RECT_PAD_SEGMENTS,
        true,
      ).translate([x, y, 0]),
    )
  })

  return Manifold.union(shapes)
}

export function createPadManifoldOp({
  Manifold,
  pad,
  padBaseThickness,
}: {
  Manifold: any
  pad: PcbSmtPad
  padBaseThickness: number
}) {
  if (pad.shape === "rect") {
    const rectBorderRadius = extractRectBorderRadius(pad)
    return createRoundedRectPrism({
      Manifold,
      width: pad.width,
      height: pad.height,
      thickness: padBaseThickness,
      borderRadius: rectBorderRadius,
    })
  } else if (pad.shape === "rotated_rect") {
    const rectBorderRadius = extractRectBorderRadius(pad)
    let padOp = createRoundedRectPrism({
      Manifold,
      width: pad.width,
      height: pad.height,
      thickness: padBaseThickness,
      borderRadius: rectBorderRadius,
    })

    const rotation = pad.ccw_rotation ?? 0
    if (rotation) {
      padOp = padOp.rotate([0, 0, rotation])
    }

    return padOp
  } else if (pad.shape === "circle" && pad.radius) {
    return Manifold.cylinder(padBaseThickness, pad.radius, -1, 32, true)
  }
  return null
}
