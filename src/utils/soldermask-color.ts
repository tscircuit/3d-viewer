import * as THREE from "three"

/** Non-green preset colors accepted by the board solderMaskColor prop. */
export const SOLDERMASK_PRESET_HEX = {
  red: "#650202",
  blue: "#004aab",
  purple: "#15008a",
  black: "#000000",
  white: "#dddddd",
  yellow: "#ae8000",
} as const

export const SOLDERMASK_OPACITY = 0.875

type SoldermaskColorPreset = keyof typeof SOLDERMASK_PRESET_HEX

/**
 * Resolves an explicitly requested non-green mask color. Green, missing,
 * not_specified, and unknown strings return null so callers preserve their
 * material-based legacy color.
 */
export const resolveSoldermaskColor = (
  requestedColor?: string | null,
): THREE.Color | null => {
  const normalizedColor = requestedColor?.trim()
  if (
    !normalizedColor ||
    normalizedColor.toLowerCase() === "green" ||
    normalizedColor.toLowerCase() === "not_specified"
  ) {
    return null
  }

  const presetName = normalizedColor.toLowerCase() as SoldermaskColorPreset
  const presetColor = SOLDERMASK_PRESET_HEX[presetName]
  return presetColor ? new THREE.Color(presetColor) : null
}

/** Match yellow mask pixels before the existing copper-color heuristic. */
export const isYellowSoldermaskColor = ({
  red,
  green,
  blue,
}: {
  red: number
  green: number
  blue: number
}): boolean =>
  Math.hypot(red - 174, green - 128, blue) < 4 ||
  Math.hypot(red - 177, green - 133, blue - 34) < 4

export const compositeSoldermaskOverCopper = (
  soldermaskColor: THREE.Color,
  copperColor: THREE.Color,
): THREE.Color =>
  soldermaskColor
    .clone()
    .multiplyScalar(SOLDERMASK_OPACITY)
    .add(copperColor.clone().multiplyScalar(1 - SOLDERMASK_OPACITY))

export const soldermaskColorToCss = (color: THREE.Color): string => {
  const displayColor = color.clone().convertLinearToSRGB()
  const channels = [
    Math.round(displayColor.r * 255),
    Math.round(displayColor.g * 255),
    Math.round(displayColor.b * 255),
  ]
  return `rgb(${channels.join(",")})`
}
