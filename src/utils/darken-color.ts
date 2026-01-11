// Utility functions for color manipulation
export function darkenColor(colorStr: string, factor: number = 0.75): string {
  // Parse RGB from "rgb(r, g, b)" format
  const match = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (!match) return colorStr

  const r = Math.round(parseInt(match[1]!) * factor)
  const g = Math.round(parseInt(match[2]!) * factor)
  const b = Math.round(parseInt(match[3]!) * factor)

  return `rgb(${r}, ${g}, ${b})`
}
