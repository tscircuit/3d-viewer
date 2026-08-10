export type ReferenceObjectType = "banana" | "credit-card" | "14in-macbook"

export interface ReferenceObjectSpec {
  type: ReferenceObjectType
  label: string
  width: number
  height: number
  depth: number
  zCenter: number
}

export interface BoardDimensions {
  width?: number
  height?: number
}

export interface BoardCenter {
  x: number
  y: number
}

export interface Bounds3d {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

export const REFERENCE_OBJECT_CLEARANCE_MM = 10

export const REFERENCE_OBJECT_SPECS: Record<
  ReferenceObjectType,
  ReferenceObjectSpec
> = {
  banana: {
    type: "banana",
    label: "Show Banana",
    // USDA describes a medium banana as 7 to 7 7/8 inches long. The 190 mm
    // envelope is near the midpoint of that range.
    width: 190,
    height: 60,
    depth: 34,
    zCenter: 17,
  },
  "credit-card": {
    type: "credit-card",
    label: "Show Credit Card",
    // ISO/IEC 7810 ID-1 dimensions.
    width: 85.6,
    height: 53.98,
    depth: 0.76,
    zCenter: 0,
  },
  "14in-macbook": {
    type: "14in-macbook",
    label: "Show 14in Macbook",
    // Current 14-inch MacBook Pro exterior dimensions.
    width: 312.6,
    height: 221.2,
    depth: 15.5,
    zCenter: 0,
  },
}

export const REFERENCE_OBJECT_OPTIONS = Object.values(REFERENCE_OBJECT_SPECS)

export const REFERENCE_OBJECT_MENU_OPTIONS: Array<{
  type: ReferenceObjectType | null
  label: string
}> = [{ type: null, label: "None" }, ...REFERENCE_OBJECT_OPTIONS]

export const toggleReferenceObject = (
  current: ReferenceObjectType | null,
  selected: ReferenceObjectType | null,
): ReferenceObjectType | null => (current === selected ? null : selected)

const safeDimension = (dimension: number | undefined) =>
  Number.isFinite(dimension) ? Math.max(dimension ?? 0, 0) : 0

const safeCoordinate = (coordinate: number | undefined) =>
  Number.isFinite(coordinate) ? (coordinate ?? 0) : 0

export const getReferenceObjectPosition = (
  type: ReferenceObjectType,
  boardDimensions?: BoardDimensions,
  boardCenter?: BoardCenter,
): { x: number; y: number; z: number } => {
  const spec = REFERENCE_OBJECT_SPECS[type]
  const boardWidth = safeDimension(boardDimensions?.width)
  const centerX = safeCoordinate(boardCenter?.x)
  const centerY = safeCoordinate(boardCenter?.y)

  return {
    x:
      centerX + boardWidth / 2 + REFERENCE_OBJECT_CLEARANCE_MM + spec.width / 2,
    y: centerY,
    z: 0,
  }
}

export const getComparisonBounds = (
  type: ReferenceObjectType,
  boardDimensions?: BoardDimensions,
  boardCenter?: BoardCenter,
): Bounds3d => {
  const spec = REFERENCE_OBJECT_SPECS[type]
  const boardWidth = safeDimension(boardDimensions?.width)
  const boardHeight = safeDimension(boardDimensions?.height)
  const centerX = safeCoordinate(boardCenter?.x)
  const centerY = safeCoordinate(boardCenter?.y)
  const referencePosition = getReferenceObjectPosition(
    type,
    boardDimensions,
    boardCenter,
  )

  return {
    minX: Math.min(
      centerX - boardWidth / 2,
      referencePosition.x - spec.width / 2,
    ),
    maxX: Math.max(
      centerX + boardWidth / 2,
      referencePosition.x + spec.width / 2,
    ),
    minY: Math.min(
      centerY - boardHeight / 2,
      referencePosition.y - spec.height / 2,
    ),
    maxY: Math.max(
      centerY + boardHeight / 2,
      referencePosition.y + spec.height / 2,
    ),
    minZ: Math.min(0, referencePosition.z + spec.zCenter - spec.depth / 2),
    maxZ: Math.max(0, referencePosition.z + spec.zCenter + spec.depth / 2),
  }
}
