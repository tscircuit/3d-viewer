import * as THREE from "three"
import type { Mesh } from "manifold-3d"

export function manifoldMeshToThreeGeometry(
  manifoldMesh: Mesh,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  const originalPositions = manifoldMesh.vertProperties
  const originalIndices = manifoldMesh.triVerts

  const newPositions: number[] = []
  const newUvs: number[] = []
  const newNormals: number[] = []

  const topIndices: number[] = []
  const bottomIndices: number[] = []
  const sideIndices: number[] = []

  // Calculate Bounds for UV mapping
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity
  for (let i = 0; i < originalPositions.length; i += 3) {
    const x = originalPositions[i]!
    const y = originalPositions[i + 1]!
    const z = originalPositions[i + 2]!
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
    if (z < minZ) minZ = z
    if (z > maxZ) maxZ = z
  }
  const width = maxX - minX || 1
  const height = maxY - minY || 1
  const thickness = maxZ - minZ || 0.1

  const addTriangle = (
    indices: number[],
    targetIndexList: number[],
    normal?: THREE.Vector3,
  ) => {
    const triangleNormal =
      normal ||
      (() => {
        const vA = new THREE.Vector3(
          originalPositions[indices[0]! * 3],
          originalPositions[indices[0]! * 3 + 1],
          originalPositions[indices[0]! * 3 + 2],
        )
        const vB = new THREE.Vector3(
          originalPositions[indices[1]! * 3],
          originalPositions[indices[1]! * 3 + 1],
          originalPositions[indices[1]! * 3 + 2],
        )
        const vC = new THREE.Vector3(
          originalPositions[indices[2]! * 3],
          originalPositions[indices[2]! * 3 + 1],
          originalPositions[indices[2]! * 3 + 2],
        )
        const cb = new THREE.Vector3().subVectors(vC, vB)
        const ab = new THREE.Vector3().subVectors(vA, vB)
        return new THREE.Vector3().crossVectors(cb, ab).normalize()
      })()

    for (let j = 0; j < 3; j++) {
      const idx = indices[j]!
      const x = originalPositions[idx * 3]!
      const y = originalPositions[idx * 3 + 1]!
      const z = originalPositions[idx * 3 + 2]!

      newPositions.push(x, y, z)
      newNormals.push(triangleNormal.x, triangleNormal.y, triangleNormal.z)

      if (Math.abs(triangleNormal.z) > 0.9) {
        // Top or Bottom UVs
        newUvs.push((x - minX) / width, (y - minY) / height)
      } else {
        // Side UVs: U is distance along XY, V is Z height
        // For simple tiling, we can use x + y as U
        newUvs.push((x + y) / width, (z - minZ) / thickness)
      }
      targetIndexList.push(newPositions.length / 3 - 1)
    }
  }

  for (let i = 0; i < originalIndices.length; i += 3) {
    const tri = [
      originalIndices[i]!,
      originalIndices[i + 1]!,
      originalIndices[i + 2]!,
    ]
    const vA = new THREE.Vector3(
      originalPositions[tri[0]! * 3],
      originalPositions[tri[0]! * 3 + 1],
      originalPositions[tri[0]! * 3 + 2],
    )
    const vB = new THREE.Vector3(
      originalPositions[tri[1]! * 3],
      originalPositions[tri[1]! * 3 + 1],
      originalPositions[tri[1]! * 3 + 2],
    )
    const vC = new THREE.Vector3(
      originalPositions[tri[2]! * 3],
      originalPositions[tri[2]! * 3 + 1],
      originalPositions[tri[2]! * 3 + 2],
    )
    const cb = new THREE.Vector3().subVectors(vC, vB)
    const ab = new THREE.Vector3().subVectors(vA, vB)
    const normal = new THREE.Vector3().crossVectors(cb, ab).normalize()

    if (normal.z > 0.9) addTriangle(tri, topIndices, normal)
    else if (normal.z < -0.9) addTriangle(tri, bottomIndices, normal)
    else addTriangle(tri, sideIndices, normal)
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(newPositions, 3),
  )
  geometry.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute(newNormals, 3),
  )
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(newUvs, 2))

  const finalIndices = [...topIndices, ...bottomIndices, ...sideIndices]
  geometry.setIndex(new THREE.Uint32BufferAttribute(finalIndices, 1))

  geometry.clearGroups()
  geometry.addGroup(0, topIndices.length, 0)
  geometry.addGroup(topIndices.length, bottomIndices.length, 1)
  geometry.addGroup(
    topIndices.length + bottomIndices.length,
    sideIndices.length,
    2,
  )

  return geometry
}
