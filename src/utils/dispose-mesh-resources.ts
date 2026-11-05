import * as THREE from "three"

export const disposeMeshResources = (
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>,
) => {
  mesh.geometry.dispose()

  if (Array.isArray(mesh.material)) {
    for (const material of mesh.material) {
      material.dispose()
    }
  } else {
    mesh.material.dispose()
  }
}
