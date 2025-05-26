import * as THREE from "three"
import type { PcbBoard } from "circuit-json"
import type { ManifoldTextures } from "../../hooks/useManifoldBoardBuilder"

// Function for creating texture meshes
export function createTextureMeshes(
  textures: ManifoldTextures | null,
  boardData: PcbBoard | null,
  pcbThickness: number | null,
): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  if (!textures || !boardData || pcbThickness === null) return meshes

  const createTexturePlane = (
    texture: THREE.CanvasTexture | null | undefined,
    yOffset: number,
    isBottomLayer: boolean,
    keySuffix: string,
  ) => {
    if (!texture) return null
    const planeGeom = new THREE.PlaneGeometry(boardData.width, boardData.height)
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false, // Important for layers to avoid z-fighting issues with board itself
    })
    const mesh = new THREE.Mesh(planeGeom, material)
    mesh.position.set(boardData.center.x, boardData.center.y, yOffset)
    if (isBottomLayer) {
      mesh.rotation.set(Math.PI, 0, 0) // Flip for bottom layer
    }
    mesh.name = `${isBottomLayer ? "bottom" : "top"}-${keySuffix}-texture-plane`
    return mesh
  }

  const topTraceMesh = createTexturePlane(
    textures.topTrace,
    pcbThickness / 2 + 0.015, // Offset similar to CadViewerManifold
    false,
    "trace",
  )
  if (topTraceMesh) meshes.push(topTraceMesh)

  const topSilkscreenMesh = createTexturePlane(
    textures.topSilkscreen,
    pcbThickness / 2 + 0.017, // Slightly above trace
    false,
    "silkscreen",
  )
  if (topSilkscreenMesh) meshes.push(topSilkscreenMesh)

  const bottomTraceMesh = createTexturePlane(
    textures.bottomTrace,
    -pcbThickness / 2 - 0.015,
    true,
    "trace",
  )
  if (bottomTraceMesh) meshes.push(bottomTraceMesh)

  const bottomSilkscreenMesh = createTexturePlane(
    textures.bottomSilkscreen,
    -pcbThickness / 2 - 0.017,
    true,
    "silkscreen",
  )
  if (bottomSilkscreenMesh) meshes.push(bottomSilkscreenMesh)

  return meshes
}
