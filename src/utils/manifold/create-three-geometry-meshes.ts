import * as THREE from "three"
import type { ManifoldGeoms } from "../../hooks/useManifoldBoardBuilder"

export function createGeometryMeshes(
  geoms: ManifoldGeoms | null,
): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  if (!geoms) return meshes

  if (geoms.board && geoms.board.geometry) {
    const mesh = new THREE.Mesh(
      geoms.board.geometry,
      new THREE.MeshStandardMaterial({
        color: geoms.board.color,
        side: THREE.DoubleSide,
        flatShading: true,
      }),
    )
    mesh.name = "board-geom"
    meshes.push(mesh)
  }

  const createMeshesFromArray = (
    geomArray?: Array<{
      key: string
      geometry: THREE.BufferGeometry
      color: THREE.Color
    }>,
  ) => {
    if (geomArray) {
      geomArray.forEach((comp) => {
        const mesh = new THREE.Mesh(
          comp.geometry,
          new THREE.MeshStandardMaterial({
            color: comp.color,
            side: THREE.DoubleSide,
            flatShading: true, // Consistent with board
          }),
        )
        mesh.name = comp.key // Use provided key for identification
        meshes.push(mesh)
      })
    }
  }

  createMeshesFromArray(geoms.platedHoles)
  createMeshesFromArray(geoms.smtPads)
  createMeshesFromArray(geoms.vias)
  // Add other categories as they are defined in ManifoldGeoms

  return meshes
}
