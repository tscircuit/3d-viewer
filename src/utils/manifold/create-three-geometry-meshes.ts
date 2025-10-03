import * as THREE from "three"
import type { ManifoldGeoms } from "../../hooks/useManifoldBoardBuilder"

export function createGeometryMeshes(
  geoms: ManifoldGeoms | null,
): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  if (!geoms) return meshes

  if (geoms.board && geoms.board.geometry) {
    const { materialProps } = geoms.board
    const mesh = new THREE.Mesh(
      geoms.board.geometry,
      new THREE.MeshPhysicalMaterial({
        color: geoms.board.color,
        side: THREE.DoubleSide,
        flatShading: true,
        metalness: materialProps?.metalness ?? 0,
        roughness: materialProps?.roughness ?? 1,
        ior: materialProps?.ior ?? 1.5,
        sheen: materialProps?.sheen ?? 0,
        clearcoat: materialProps?.clearcoat ?? 0,
        specularIntensity: materialProps?.specularIntensity ?? 1,
        opacity: materialProps?.alpha ?? 1,
        transparent: (materialProps?.alpha ?? 1) < 1,
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
  createMeshesFromArray(geoms.copperPours)
  // Add other categories as they are defined in ManifoldGeoms

  return meshes
}
