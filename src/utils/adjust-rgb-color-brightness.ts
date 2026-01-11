// Utility function for color brightness manipulation
/**
 * Adjusts the brightness of an RGB color string.
 * @param colorStr - Color in "rgb(r, g, b)" format
 * @param factor - Brightness factor: <1 darkens, >1 lightens (e.g., 0.5 = 50% brightness, 1.5 = 150% brightness)
 * @returns Adjusted color in "rgb(r, g, b)" format
 */
export function adjustRgbColorBrightness(
  colorStr: string,
  factor: number = 1,
): string {
  // Parse RGB from "rgb(r, g, b)" format
  const match = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (!match) return colorStr

  const r = Math.min(255, Math.max(0, Math.round(parseInt(match[1]!) * factor)))
  const g = Math.min(255, Math.max(0, Math.round(parseInt(match[2]!) * factor)))
  const b = Math.min(255, Math.max(0, Math.round(parseInt(match[3]!) * factor)))

  return `rgb(${r}, ${g}, ${b})`
}
