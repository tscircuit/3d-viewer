export type RectBorderRadiusInput = number | null | undefined

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

  return Math.max(0, Math.min(rawRadius, halfWidth, halfHeight))
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
