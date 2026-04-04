import * as THREE from "three"
import type { Mesh } from "manifold-3d"

export function manifoldMeshToThreeGeometry(
  manifoldMesh: Mesh,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  const positions = manifoldMesh.vertProperties
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  )

  const indices = Array.from(manifoldMesh.triVerts)
  const topIndices: number[] = []
  const bottomIndices: number[] = []
  const sideIndices: number[] = []

  // Calculate UVs based on XY bounds
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]!
    const y = positions[i + 1]!
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  const width = maxX - minX || 1
  const height = maxY - minY || 1
  const uvs = new Float32Array((positions.length / 3) * 2)
  for (let i = 0; i < positions.length; i += 3) {
    uvs[(i / 3) * 2] = (positions[i]! - minX) / width
    uvs[(i / 3) * 2 + 1] = (positions[i + 1]! - minY) / height
  }

  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2))

  // Group triangles by normal
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i]!
    const b = indices[i + 1]!
    const c = indices[i + 2]!

    const vA = new THREE.Vector3(
      positions[a * 3]!,
      positions[a * 3 + 1]!,
      positions[a * 3 + 2]!,
    )
    const vB = new THREE.Vector3(
      positions[b * 3]!,
      positions[b * 3 + 1]!,
      positions[b * 3 + 2]!,
    )
    const vC = new THREE.Vector3(
      positions[c * 3]!,
      positions[c * 3 + 1]!,
      positions[c * 3 + 2]!,
    )

    const cb = new THREE.Vector3().subVectors(vC, vB)
    const ab = new THREE.Vector3().subVectors(vA, vB)
    const normal = new THREE.Vector3().crossVectors(cb, ab).normalize()

    if (normal.z > 0.9) {
      topIndices.push(a, b, c)
    } else if (normal.z < -0.9) {
      bottomIndices.push(a, b, c)
    } else {
      sideIndices.push(a, b, c)
    }
  }

  const finalIndices = [...topIndices, ...bottomIndices, ...sideIndices]
  geometry.setIndex(new THREE.Uint32BufferAttribute(finalIndices, 1))

  geometry.clearGroups()
  geometry.addGroup(0, topIndices.length, 0) // Top
  geometry.addGroup(topIndices.length, bottomIndices.length, 1) // Bottom
  geometry.addGroup(
    topIndices.length + bottomIndices.length,
    sideIndices.length,
    2,
  ) // Sides

  geometry.computeVertexNormals()

  return geometry
}
