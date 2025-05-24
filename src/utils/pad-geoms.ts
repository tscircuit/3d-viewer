import type { PcbSmtPad } from "circuit-json"

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
    return Manifold.cube([pad.width, pad.height, padBaseThickness], true)
  } else if (pad.shape === "circle" && pad.radius) {
    return Manifold.cylinder(padBaseThickness, pad.radius, -1, 32, true)
  }
  return null
}
