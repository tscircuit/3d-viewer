import * as THREE from "three"
import type { Mesh } from "manifold-3d"

export function manifoldMeshToThreeGeometry(
  manifoldMesh: Mesh,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(manifoldMesh.vertProperties, 3),
  )
  geometry.setIndex(new THREE.Uint32BufferAttribute(manifoldMesh.triVerts, 1))

  if (
    manifoldMesh.runIndex &&
    manifoldMesh.runIndex.length > 1 &&
    manifoldMesh.runOriginalID
  ) {
    for (let i = 0; i < manifoldMesh.runIndex.length - 1; i++) {
      const start = manifoldMesh.runIndex[i]!
      const count = manifoldMesh.runIndex[i + 1]! - start
      geometry.addGroup(start, count, 0)
    }
  } else {
    geometry.addGroup(0, manifoldMesh.triVerts.length, 0)
  }

  return geometry
}
