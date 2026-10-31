import type { AnyCircuitElement, CadComponent } from "circuit-json"

type BoardDimensions = {
  width?: number
  height?: number
}

type BoardCenter = {
  x: number
  y: number
}

type Bounds3d = {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

function decodeDataUrlText(url: string): string | null {
  if (!url.startsWith("data:")) return null
  const commaIndex = url.indexOf(",")
  if (commaIndex === -1) return null
  const header = url.slice(5, commaIndex)
  const payload = url.slice(commaIndex + 1)
  try {
    if (header.includes(";base64")) {
      if (typeof Buffer !== "undefined") {
        return Buffer.from(payload, "base64").toString("utf8")
      }
      if (typeof atob === "function") {
        return atob(payload)
      }
      return null
    }
    return decodeURIComponent(payload)
  } catch {
    return null
  }
}

function getInlineObjBounds(
  objText: string,
  scale: number,
  offset: { x: number; y: number; z: number },
): Bounds3d | null {
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let minZ = Number.POSITIVE_INFINITY
  let maxZ = Number.NEGATIVE_INFINITY

  for (const rawLine of objText.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line.startsWith("v ")) continue
    const parts = line.split(/\s+/)
    if (parts.length < 4) continue
    const vx = Number(parts[1])
    const vy = Number(parts[2])
    const vz = Number(parts[3])
    if (!Number.isFinite(vx) || !Number.isFinite(vy) || !Number.isFinite(vz)) {
      continue
    }
    const x = vx * scale + offset.x
    const y = vy * scale + offset.y
    const z = vz * scale + offset.z
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
    minZ = Math.min(minZ, z)
    maxZ = Math.max(maxZ, z)
  }

  if (!Number.isFinite(minX)) return null
  return { minX, maxX, minY, maxY, minZ, maxZ }
}

export function getCadAssemblyBounds(
  cadComponents: readonly CadComponent[],
): Bounds3d | undefined {
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let minZ = Number.POSITIVE_INFINITY
  let maxZ = Number.NEGATIVE_INFINITY

  const includeBounds = (b: Bounds3d) => {
    minX = Math.min(minX, b.minX)
    maxX = Math.max(maxX, b.maxX)
    minY = Math.min(minY, b.minY)
    maxY = Math.max(maxY, b.maxY)
    minZ = Math.min(minZ, b.minZ)
    maxZ = Math.max(maxZ, b.maxZ)
  }

  for (const component of cadComponents) {
    const pos = {
      x: component.position?.x ?? 0,
      y: component.position?.y ?? 0,
      z: component.position?.z ?? 0,
    }
    const scale = component.model_unit_to_mm_scale_factor ?? 1
    let matchedGeometry = false

    if (component.size) {
      const halfX = Math.abs(component.size.x ?? 0) / 2
      const halfY = Math.abs(component.size.y ?? 0) / 2
      const halfZ = Math.abs(component.size.z ?? 0) / 2
      if (halfX > 0 || halfY > 0 || halfZ > 0) {
        includeBounds({
          minX: pos.x - halfX,
          maxX: pos.x + halfX,
          minY: pos.y - halfY,
          maxY: pos.y + halfY,
          minZ: pos.z - halfZ,
          maxZ: pos.z + halfZ,
        })
        matchedGeometry = true
      }
    }

    if (component.model_obj_url) {
      const objText = decodeDataUrlText(component.model_obj_url)
      if (objText) {
        const objBounds = getInlineObjBounds(objText, scale, pos)
        if (objBounds) {
          includeBounds(objBounds)
          matchedGeometry = true
        }
      }
    }

    if (!matchedGeometry && component.position) {
      includeBounds({
        minX: pos.x,
        maxX: pos.x,
        minY: pos.y,
        maxY: pos.y,
        minZ: pos.z,
        maxZ: pos.z,
      })
    }
  }

  if (!Number.isFinite(minX)) return undefined
  const spanX = maxX - minX
  const spanY = maxY - minY
  const spanZ = maxZ - minZ
  if (
    spanX === 0 &&
    spanY === 0 &&
    spanZ === 0 &&
    minX === 0 &&
    minY === 0 &&
    minZ === 0
  ) {
    return undefined
  }
  return { minX, maxX, minY, maxY, minZ, maxZ }
}

export function getInitialCameraPosition({
  boardDimensions,
  boardCenter,
  cadComponents,
  circuitJson,
}: {
  boardDimensions?: BoardDimensions
  boardCenter?: BoardCenter
  cadComponents?: readonly CadComponent[]
  circuitJson?: readonly AnyCircuitElement[]
}): readonly [number, number, number] {
  if (!boardDimensions || !boardCenter) {
    const resolvedCadComponents =
      cadComponents ??
      circuitJson?.filter(
        (element): element is CadComponent => element.type === "cad_component",
      )
    const assemblyBounds = resolvedCadComponents
      ? getCadAssemblyBounds(resolvedCadComponents)
      : undefined

    if (!assemblyBounds) return [5, -5, 5]

    const safeWidth = Math.max(assemblyBounds.maxX - assemblyBounds.minX, 1)
    const safeHeight = Math.max(assemblyBounds.maxY - assemblyBounds.minY, 1)
    const safeDepth = Math.max(assemblyBounds.maxZ - assemblyBounds.minZ, 0)
    const largestDimension = Math.max(safeWidth, safeHeight, safeDepth, 5)
    const centerX = (assemblyBounds.minX + assemblyBounds.maxX) / 2
    const centerY = (assemblyBounds.minY + assemblyBounds.maxY) / 2
    const baseZ = Math.max(assemblyBounds.maxZ, 0)

    return [
      centerX + largestDimension * 0.4,
      centerY - largestDimension * 0.7,
      baseZ + largestDimension * 0.9,
    ]
  }

  const safeWidth = Math.max(boardDimensions.width ?? 0, 1)
  const safeHeight = Math.max(boardDimensions.height ?? 0, 1)
  const largestDimension = Math.max(safeWidth, safeHeight, 5)

  // Camera and board positions share board-world millimeter coordinates.
  return [
    boardCenter.x + largestDimension * 0.4,
    boardCenter.y - largestDimension * 0.7,
    largestDimension * 0.9,
  ]
}
