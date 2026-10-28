import * as THREE from "three"

export type SectionAxis = "x" | "y" | "z"
export type Point2 = [number, number]
export interface SectionSpec {
  axis: SectionAxis
  offset: number
  flipped: boolean
}

/** Self-contained so the exact same loop builder can run in a Blob worker.
 * Follows gltf-slice's welded segment graph and nested-loop cap approach.
 * Open chains are deliberately left uncapped; cavities must remain empty.
 */
export function findSectionLoops(input: {
  positions: Float32Array
  axis: SectionAxis
  offset: number
  epsilon?: number
}): { loops: Point2[][]; openChains: number } {
  const { positions, axis, offset, epsilon = 0.00001 } = input
  const k = axis === "x" ? 0 : axis === "y" ? 1 : 2
  let minimum = Infinity,
    maximum = -Infinity
  for (let i = k; i < positions.length; i += 3) {
    minimum = Math.min(minimum, positions[i]!)
    maximum = Math.max(maximum, positions[i]!)
  }
  if (offset <= minimum + epsilon || offset >= maximum - epsilon)
    return { loops: [], openChains: 0 }
  const u = (k + 1) % 3
  const v = (k + 2) % 3
  const points = new Map<string, Point2>()
  const adjacency = new Map<string, Set<string>>()
  const edges = new Set<string>()
  const key = (p: Point2) =>
    `${Math.round(p[0] / epsilon)},${Math.round(p[1] / epsilon)}`
  for (let i = 0; i < positions.length; i += 9) {
    const hits: Point2[] = []
    const distances = [0, 1, 2].map((j) => positions[i + j * 3 + k]! - offset)
    // Tangencies and triangles lying on the plane are not new cut surfaces.
    const onPlane = distances.filter((d) => Math.abs(d) <= epsilon).length
    if (onPlane === 3) continue
    if (
      !(
        distances.some((d) => d > epsilon) &&
        distances.some((d) => d < -epsilon)
      ) &&
      !(onPlane === 2 && distances.some((d) => d < -epsilon))
    )
      continue
    for (let j = 0; j < 3; j++) {
      const a = i + j * 3
      const b = i + ((j + 1) % 3) * 3
      const da = distances[j]!
      const db = distances[(j + 1) % 3]!
      if (Math.abs(da) <= epsilon)
        hits.push([positions[a + u]!, positions[a + v]!])
      else if (da > 0 !== db > 0 && Math.abs(db) > epsilon) {
        const t = da / (da - db)
        hits.push([
          positions[a + u]! + t * (positions[b + u]! - positions[a + u]!),
          positions[a + v]! + t * (positions[b + v]! - positions[a + v]!),
        ])
      }
    }
    const unique = [...new Map(hits.map((p) => [key(p), p])).values()]
    if (unique.length !== 2) continue
    const [a, b] = unique.map(key) as [string, string]
    if (a === b) continue
    const edge = a < b ? `${a}|${b}` : `${b}|${a}`
    if (edges.has(edge)) continue
    edges.add(edge)
    points.set(a, unique[0]!)
    points.set(b, unique[1]!)
    if (!adjacency.has(a)) adjacency.set(a, new Set())
    if (!adjacency.has(b)) adjacency.set(b, new Set())
    adjacency.get(a)!.add(b)
    adjacency.get(b)!.add(a)
  }
  const loops: Point2[][] = []
  let openChains = 0
  while (edges.size) {
    const first = edges.values().next().value!
    const [start, next] = first.split("|") as [string, string]
    const path = [start]
    let previous = start
    let current = next
    const remove = (a: string, b: string) => {
      edges.delete(a < b ? `${a}|${b}` : `${b}|${a}`)
      adjacency.get(a)?.delete(b)
      adjacency.get(b)?.delete(a)
    }
    remove(start, next)
    while (current !== start) {
      path.push(current)
      const candidates = [...(adjacency.get(current) ?? [])]
      if (!candidates.length) break
      // Prefer the straightest continuation at welded junctions.
      const p = points.get(previous)!
      const c = points.get(current)!
      candidates.sort((a, b) => {
        const score = (s: string) => {
          const n = points.get(s)!
          return (
            ((c[0] - p[0]) * (n[0] - c[0]) + (c[1] - p[1]) * (n[1] - c[1])) /
            (Math.hypot(n[0] - c[0], n[1] - c[1]) || 1)
          )
        }
        return score(b) - score(a)
      })
      const chosen = candidates[0]!
      remove(current, chosen)
      previous = current
      current = chosen
    }
    if (current === start && path.length >= 3)
      loops.push(path.map((p) => points.get(p)!))
    else openChains++
  }
  return { loops, openChains }
}

function contains(p: Point2, polygon: Point2[]) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!,
      b = polygon[j]!
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside
  }
  return inside
}

export function buildSectionCap(loops: Point2[][], spec: SectionSpec) {
  const rings = loops
    .map((points) => ({
      points,
      area: Math.abs(
        THREE.ShapeUtils.area(points.map((p) => new THREE.Vector2(...p))),
      ),
      parent: -1,
      depth: 0,
    }))
    .sort((a, b) => b.area - a.area)
  rings.forEach((ring, i) => {
    for (let j = 0; j < i; j++) {
      if (contains(ring.points[0]!, rings[j]!.points)) ring.parent = j
    }
    ring.depth = ring.parent < 0 ? 0 : rings[ring.parent]!.depth + 1
  })
  const positions: number[] = [],
    uv: number[] = []
  const k = spec.axis === "x" ? 0 : spec.axis === "y" ? 1 : 2
  const u = (k + 1) % 3,
    v = (k + 2) % 3
  rings.forEach((ring, i) => {
    if (ring.depth % 2) return
    const contour = ring.points.map((p) => new THREE.Vector2(...p))
    const holes = rings
      .filter((r) => r.parent === i && r.depth % 2)
      .map((r) => r.points.map((p) => new THREE.Vector2(...p)))
    // ShapeUtils may remove duplicate end vertices; flatten after triangulating.
    const triangles = THREE.ShapeUtils.triangulateShape(contour, holes)
    const flat = [...contour, ...holes.flat()]
    for (const triangle of triangles) {
      if (!spec.flipped) triangle.reverse()
      for (const index of triangle) {
        const p = flat[index]!
        const xyz = [0, 0, 0]
        xyz[k] = spec.offset
        xyz[u] = p.x
        xyz[v] = p.y
        positions.push(...xyz)
        // A fixed physical scale keeps hatching stable across meshes and movement.
        uv.push(p.x / 8, p.y / 8)
      }
    }
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  )
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2))
  geometry.computeVertexNormals()
  return geometry
}

export function sectionPlane(spec: SectionSpec) {
  const normal = new THREE.Vector3()
  normal[spec.axis] = spec.flipped ? -1 : 1
  return new THREE.Plane(normal, -spec.offset * normal[spec.axis])
}

/** Same 45-degree tile and colors as gltf-slice/create-hatch-texture. */
export function createSectionHatch() {
  const size = 128,
    data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const color =
        (x + size - 1 - y) % 16 < 3 ? [52, 49, 45, 255] : [255, 214, 102, 255]
      data.set(color, (y * size + x) * 4)
    }
  const texture = new THREE.DataTexture(data, size, size)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}
