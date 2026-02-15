import * as THREE from "three"
import type { ManifoldGeoms } from "../../hooks/useManifoldBoardBuilder"
import { createBoardMaterial } from "../create-board-material"

export function createGeometryMeshes(
  geoms: ManifoldGeoms | null,
): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  if (!geoms) return meshes

  if (geoms.board && geoms.board.geometry) {
    const mesh = new THREE.Mesh(
      geoms.board.geometry,
      createBoardMaterial({
        material: geoms.board.material,
        color: geoms.board.color,
        side: THREE.DoubleSide,
        isFaux: geoms.board.isFaux,
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
  createMeshesFromArray(geoms.vias)
  // Copper pours now use texture-based rendering instead of geometry
  // Add other categories as they are defined in ManifoldGeoms

  return meshes
}
