import {
  applyCopperMaskUvs,
  cloneMaskedCopperMaterial,
} from "../create-masked-copper-material"
import * as THREE from "three"
import type { ManifoldGeoms } from "../../hooks/useManifoldBoardBuilder"
import { configureObjectShadows } from "../configure-object-shadows"
import { createBoardMaterial } from "../create-board-material"

export function createGeometryMeshes(
  geoms: ManifoldGeoms | null,
  copperMaterial?: THREE.MeshStandardMaterial,
): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  if (!geoms) return meshes

  if (geoms.board?.geometry) {
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
    configureObjectShadows(mesh, { castShadow: false, receiveShadow: true })
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
      for (const comp of geomArray) {
        if (copperMaterial) applyCopperMaskUvs(comp.geometry, copperMaterial)
        const mesh = new THREE.Mesh(
          comp.geometry,
          (copperMaterial
            ? cloneMaskedCopperMaterial(copperMaterial)
            : undefined) ??
            new THREE.MeshStandardMaterial({
              color: comp.color,
              side: THREE.DoubleSide,
              flatShading: true, // Consistent with board
            }),
        )
        mesh.name = comp.key // Use provided key for identification
        configureObjectShadows(mesh)
        meshes.push(mesh)
      }
    }
  }

  createMeshesFromArray(geoms.platedHoles)
  createMeshesFromArray(geoms.vias)
  // Copper pours now use texture-based rendering instead of geometry
  // Add other categories as they are defined in ManifoldGeoms

  return meshes
}
