const MM_PER_INCH = 25.4
const MM_PER_MIL = MM_PER_INCH / 1000

export type DimensionValue = number | string | null | undefined

const dimensionRegex =
  /^\s*(-?\d*(?:\.\d+)?)(?:\s*(mm|mil|inch|in|"))?\s*$/i

function normalizeUnit(unit?: string | null): string | undefined {
  if (!unit) return undefined
  const normalized = unit.trim().toLowerCase()
  if (normalized === '"') return "in"
  if (normalized === "inch") return "in"
  return normalized
}

export function parseDimensionToMm(
  value: DimensionValue,
): number | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined
  }

  if (typeof value !== "string") return undefined

  const trimmed = value.trim()
  if (trimmed.length === 0) return undefined

  const match = trimmed.match(dimensionRegex)
  if (!match) {
    const numeric = Number.parseFloat(trimmed)
    return Number.isFinite(numeric) ? numeric : undefined
  }

  const [, magnitudeRaw, unitRaw] = match
  const magnitude = Number.parseFloat(magnitudeRaw || "0")
  if (!Number.isFinite(magnitude)) return undefined

  const unit = normalizeUnit(unitRaw)

  switch (unit) {
    case "mil":
      return magnitude * MM_PER_MIL
    case "in":
      return magnitude * MM_PER_INCH
    case "mm":
    case undefined:
      return magnitude
    default:
      return magnitude
  }
}

export function coerceDimensionToMm(
  value: DimensionValue,
  fallback: number,
): number {
  const parsed = parseDimensionToMm(value)
  return parsed === undefined ? fallback : parsed
}
