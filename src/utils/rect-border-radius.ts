export type RectBorderRadiusInput = number | null | undefined

// Match jscad's EPS constant from @jscad/modeling/src/maths/constants
// roundedRectangle requires: roundRadius < (size/2 - EPS)
const JSCAD_EPS = 1e-5

export function clampRectBorderRadius(
  width: number,
  height: number,
  rawRadius: RectBorderRadiusInput,
): number {
  if (typeof rawRadius !== "number" || !Number.isFinite(rawRadius)) {
    return 0
  }

  if (rawRadius <= 0) {
    return 0
  }

  const halfWidth = width / 2
  const halfHeight = height / 2

  // jscad's roundedRectangle throws if roundRadius >= (halfSize - EPS)
  // We need roundRadius < halfSize - EPS, so we subtract 2*EPS for safety margin
  const maxRadius = Math.min(halfWidth, halfHeight) - 2 * JSCAD_EPS

  return Math.max(0, Math.min(rawRadius, maxRadius))
}

export function extractRectBorderRadius(source: any): RectBorderRadiusInput {
  if (!source || typeof source !== "object") return undefined

  return (
    source.corner_radius ??
    source.cornerRadius ??
    source.rect_pad_border_radius ??
    source.rectPadBorderRadius ??
    source.rect_border_radius ??
    source.rectBorderRadius ??
    undefined
  )
}
