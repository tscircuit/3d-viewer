import type { PcbBoard } from "circuit-json"
import * as THREE from "three"
import { soldermaskColorToCss } from "./soldermask-color"

export const DEFAULT_SILKSCREEN_COLOR = "rgb(255,255,255)"

const CSS_HEX_COLOR_PATTERN = /^#(?:[\da-f]{3}|[\da-f]{6})$/i
const CSS_RGB_INTEGER_PATTERN = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i
const CSS_RGB_PERCENT_PATTERN = /^rgb\(\s*\d+%\s*,\s*\d+%\s*,\s*\d+%\s*\)$/i
const CSS_HSL_PATTERN =
  /^hsl\(\s*\d*\.?\d+\s*,\s*\d*\.?\d+%\s*,\s*\d*\.?\d+%\s*\)$/i

/**
 * Resolves an explicitly requested non-white silkscreen color. White, missing,
 * not_specified, and unsupported strings return null so callers preserve the
 * default white silkscreen color.
 */
export const resolveSilkscreenColor = (
  requestedColor?: string | null,
): THREE.Color | null => {
  const normalizedColor = requestedColor?.trim()
  if (!normalizedColor) {
    return null
  }

  const lowercaseColor = normalizedColor.toLowerCase()
  if (lowercaseColor === "white" || lowercaseColor === "not_specified") {
    return null
  }

  const isCssColor =
    Object.hasOwn(THREE.Color.NAMES, lowercaseColor) ||
    CSS_HEX_COLOR_PATTERN.test(normalizedColor) ||
    CSS_RGB_INTEGER_PATTERN.test(normalizedColor) ||
    CSS_RGB_PERCENT_PATTERN.test(normalizedColor) ||
    CSS_HSL_PATTERN.test(normalizedColor)

  return isCssColor ? new THREE.Color(lowercaseColor) : null
}

export const getSilkscreenColor = (
  boardData?: Pick<PcbBoard, "silkscreen_color"> | null,
): string => {
  const resolved = resolveSilkscreenColor(boardData?.silkscreen_color)
  return resolved ? soldermaskColorToCss(resolved) : DEFAULT_SILKSCREEN_COLOR
}
