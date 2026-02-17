import type { PcbBoard } from "circuit-json"
import * as THREE from "three"
import type { ManifoldGeoms } from "../../hooks/useManifoldBoardBuilder"
import { createBoardMaterial } from "../create-board-material"
import { generateBoardUVs } from "../generate-board-uvs"

export function createGeometryMeshes(
  geoms: ManifoldGeoms | null,
  boardData?: PcbBoard | null,
  pcbTexture?: THREE.Texture | null,
): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  if (!geoms) return meshes

  if (geoms.board && geoms.board.geometry) {
    // Generate UV coordinates when a texture is provided
    if (pcbTexture && boardData) {
      generateBoardUVs(geoms.board.geometry, boardData)
      geoms.board.geometry.computeVertexNormals()
    }

    const mesh = new THREE.Mesh(
      geoms.board.geometry,
      createBoardMaterial({
        material: geoms.board.material,
        color: geoms.board.color,
        side: THREE.DoubleSide,
        isFaux: geoms.board.isFaux,
        map: pcbTexture,
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
            flatShading: true,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
          }),
        )
        mesh.name = comp.key
        meshes.push(mesh)
      })
    }
  }

  createMeshesFromArray(geoms.platedHoles)
  createMeshesFromArray(geoms.vias)

  return meshes
}
