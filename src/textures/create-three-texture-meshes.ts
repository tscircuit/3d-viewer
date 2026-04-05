import type { PcbBoard } from "circuit-json"
import type * as THREE from "three"
import type { CombinedBoardTextures } from "./index"

/**
 * @deprecated Textures are now applied directly to the board mesh in createGeometryMeshes.
 * This function returns an empty array to disable the legacy floating decal planes.
 */
export function createTextureMeshes(
  _textures: CombinedBoardTextures | null,
  _boardData: PcbBoard | null,
  _pcbThickness: number | null,
  _isFaux: boolean = false,
): THREE.Mesh[] {
  // Return empty array as textures are now applied directly to the board mesh faces
  // in src/utils/manifold/create-three-geometry-meshes.ts
  return []
}
