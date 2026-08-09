type FootprinterColor = string | number[] | undefined

const METALLIC_FOOTPRINTER_COLORS = new Set([
  "#777",
  "#cccccc",
  "#ccc",
  "#c0c0c0",
  "gold",
  "gray",
  "grey",
  "silver",
])

const isMetallicFootprinterColor = (color: FootprinterColor): boolean => {
  if (typeof color === "string") {
    return METALLIC_FOOTPRINTER_COLORS.has(color.toLowerCase())
  }

  if (Array.isArray(color) && color.length >= 3) {
    const [red = 0, green = 0, blue = 0] = color
    const isNeutral =
      Math.max(red, green, blue) - Math.min(red, green, blue) < 0.05
    return isNeutral && Math.min(red, green, blue) >= 0.45
  }

  return false
}

export const getFootprinterGeometryColor = (
  color: FootprinterColor,
  sourceComponentFtype?: string,
): FootprinterColor => {
  if (
    sourceComponentFtype !== "simple_capacitor" ||
    color === undefined ||
    isMetallicFootprinterColor(color)
  ) {
    return color
  }

  return "yellow"
}
