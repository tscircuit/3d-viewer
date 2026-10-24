import * as THREE from "three"

interface BoundaryEdge {
  start: THREE.Vector3
  end: THREE.Vector3
  normal: THREE.Vector3
  direction: THREE.Vector3
  length: number
  min: THREE.Vector3
  max: THREE.Vector3
  cuts: Array<[number, number]>
}

const TOLERANCE = 0.0001
const vertexKey = (point: THREE.Vector3) =>
  [point.x, point.y, point.z]
    .map((value) => Math.round(value / TOLERANCE))
    .join(",")

/** Creases and open boundaries, including nonconforming CSG triangulations. */
export const extractModelEdges = (
  geometry: THREE.BufferGeometry,
  thresholdAngle = 30,
): Float32Array => {
  const position = geometry.getAttribute("position")
  if (!position) return new Float32Array()
  const index = geometry.index
  const count = index?.count ?? position.count
  const start = Math.max(0, geometry.drawRange.start)
  const end = Math.min(count, start + geometry.drawRange.count)
  const thresholdDot = Math.cos(THREE.MathUtils.degToRad(thresholdAngle))
  const unmatched = new Map<string, BoundaryEdge | null>()
  const vertices: number[] = []
  const append = (edge: BoundaryEdge, from = 0, to = edge.length) => {
    if (to - from <= TOLERANCE) return
    for (const distance of [from, to]) {
      vertices.push(
        edge.start.x + edge.direction.x * distance,
        edge.start.y + edge.direction.y * distance,
        edge.start.z + edge.direction.z * distance,
      )
    }
  }

  for (let offset = start; offset + 2 < end; offset += 3) {
    const points = [0, 1, 2].map((corner) =>
      new THREE.Vector3().fromBufferAttribute(
        position,
        index?.getX(offset + corner) ?? offset + corner,
      ),
    )
    const keys = points.map(vertexKey)
    if (new Set(keys).size < 3) continue
    const normal = new THREE.Triangle(
      points[0]!,
      points[1]!,
      points[2]!,
    ).getNormal(new THREE.Vector3())
    if (!normal.lengthSq()) continue
    for (let corner = 0; corner < 3; corner++) {
      const next = (corner + 1) % 3
      const from = points[corner]!
      const to = points[next]!
      const key = `${keys[corner]}_${keys[next]}`
      const reverse = `${keys[next]}_${keys[corner]}`
      const sibling = unmatched.get(reverse)
      if (sibling) {
        if (normal.dot(sibling.normal) <= thresholdDot) append(sibling)
        unmatched.set(reverse, null)
      } else if (!unmatched.has(key)) {
        const direction = new THREE.Vector3().subVectors(to, from)
        const length = direction.length()
        unmatched.set(key, {
          start: from,
          end: to,
          normal,
          direction: direction.divideScalar(length),
          length,
          min: from.clone().min(to),
          max: from.clone().max(to),
          cuts: [],
        })
      }
    }
  }

  const boundaries = [...unmatched.values()]
    .filter((edge): edge is BoundaryEdge => !!edge)
    .sort((a, b) => a.min.x - b.min.x)
  const displacement = new THREE.Vector3()
  const perpendicular = new THREE.Vector3()
  for (let first = 0; first < boundaries.length; first++) {
    const a = boundaries[first]!
    for (let second = first + 1; second < boundaries.length; second++) {
      const b = boundaries[second]!
      if (b.min.x > a.max.x + TOLERANCE) break
      if (
        b.min.y > a.max.y + TOLERANCE ||
        b.max.y < a.min.y - TOLERANCE ||
        b.min.z > a.max.z + TOLERANCE ||
        b.max.z < a.min.z - TOLERANCE ||
        a.normal.dot(b.normal) < 1 - 0.000001 ||
        a.direction.dot(b.direction) > -1 + 0.000001
      ) {
        continue
      }
      displacement.subVectors(b.start, a.start)
      perpendicular.crossVectors(displacement, a.direction)
      if (perpendicular.lengthSq() > TOLERANCE ** 2) continue

      // Consistently wound coplanar triangles run in opposite directions at
      // their seam. A long edge may match several shorter T-junction edges.
      const bStart = displacement.dot(a.direction)
      const bEnd = displacement.subVectors(b.end, a.start).dot(a.direction)
      const from = Math.max(0, Math.min(bStart, bEnd))
      const to = Math.min(a.length, Math.max(bStart, bEnd))
      if (to - from <= TOLERANCE) continue
      a.cuts.push([from, to])
      b.cuts.push([Math.max(0, bStart - to), Math.min(b.length, bStart - from)])
    }
  }

  for (const edge of boundaries) {
    let cursor = 0
    for (const [from, to] of edge.cuts.sort((a, b) => a[0] - b[0])) {
      if (from > cursor) append(edge, cursor, from)
      cursor = Math.max(cursor, to)
    }
    append(edge, cursor)
  }
  return new Float32Array(vertices)
}
