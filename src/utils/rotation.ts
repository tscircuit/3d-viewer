import type { CadComponent } from "circuit-json"

export type RotationValue = number | string | null | undefined

const extractDegrees = (value: RotationValue): number | undefined => {
  if (value === null || value === undefined) return undefined
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const match = value.match(/-?\d+(?:\.\d+)?/)
    if (!match) return undefined
    const parsed = Number.parseFloat(match[0])
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

export const rotationValueToRadians = (
  value: RotationValue,
): number | undefined => {
  const degrees = extractDegrees(value)
  if (degrees === undefined) return undefined
  return (degrees * Math.PI) / 180
}

export const getRotationInRadians = (
  rotation?: CadComponent["rotation"],
): [number, number, number] | undefined => {
  if (!rotation) return undefined
  const x = rotationValueToRadians(rotation.x) ?? 0
  const y = rotationValueToRadians(rotation.y) ?? 0
  const z = rotationValueToRadians(rotation.z) ?? 0
  return [x, y, z]
}

export const getRotationInDegrees = (
  rotation?: CadComponent["rotation"],
): [number, number, number] | undefined => {
  if (!rotation) return undefined
  const x = extractDegrees(rotation.x) ?? 0
  const y = extractDegrees(rotation.y) ?? 0
  const z = extractDegrees(rotation.z) ?? 0
  return [x, y, z]
}

export const parseRotationDegrees = (
  value: RotationValue,
): number | undefined => extractDegrees(value)
