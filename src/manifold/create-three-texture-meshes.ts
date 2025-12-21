import * as THREE from "three"
import type { PcbBoard } from "circuit-json"
import type { ManifoldTextures } from "../hooks/useManifoldBoardBuilder"
import { BOARD_SURFACE_OFFSET } from "../geoms/constants"
import { calculateOutlineBounds } from "../utils/outline-bounds"

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
    usePolygonOffset = false,
    renderOrder = 0,
  ) => {
    if (!texture) return null

    const boardOutlineBounds = calculateOutlineBounds(boardData)
    const planeGeom = new THREE.PlaneGeometry(
      boardOutlineBounds.width,
      boardOutlineBounds.height,
    )
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: keySuffix === "panel-outlines",
      polygonOffset: usePolygonOffset,
      polygonOffsetFactor: usePolygonOffset ? -4 : 0,
      polygonOffsetUnits: usePolygonOffset ? -4 : 0,
    })
    const mesh = new THREE.Mesh(planeGeom, material)
    mesh.position.set(
      boardOutlineBounds.centerX,
      boardOutlineBounds.centerY,
      yOffset,
    )
    if (isBottomLayer) {
      mesh.rotation.set(Math.PI, 0, 0)
    }
    mesh.name = `${isBottomLayer ? "bottom" : "top"}-${keySuffix}-texture-plane`
    mesh.renderOrder = renderOrder
    return mesh
  }

  const topCopperMesh = createTexturePlane(
    textures.topCopper,
    pcbThickness / 2 + BOARD_SURFACE_OFFSET.traces,
    false,
    "copper",
    false,
    2,
  )
  if (topCopperMesh) meshes.push(topCopperMesh)

  const topCopperWithMaskMesh = createTexturePlane(
    textures.topTraceWithMask,
    pcbThickness / 2 + BOARD_SURFACE_OFFSET.traces,
    false,
    "copper-with-mask",
    false,
    2,
  )
  if (topCopperWithMaskMesh) meshes.push(topCopperWithMaskMesh)

  const topSilkscreenMesh = createTexturePlane(
    textures.topSilkscreen,
    pcbThickness / 2 + 0.003,
    false,
    "silkscreen",
    false,
    3,
  )
  if (topSilkscreenMesh) meshes.push(topSilkscreenMesh)

  const bottomCopperMesh = createTexturePlane(
    textures.bottomCopper,
    -pcbThickness / 2 - BOARD_SURFACE_OFFSET.traces,
    true,
    "copper",
    false,
    2,
  )
  if (bottomCopperMesh) meshes.push(bottomCopperMesh)

  const bottomCopperWithMaskMesh = createTexturePlane(
    textures.bottomTraceWithMask,
    -pcbThickness / 2 - BOARD_SURFACE_OFFSET.traces,
    true,
    "copper-with-mask",
    false,
    2,
  )
  if (bottomCopperWithMaskMesh) meshes.push(bottomCopperWithMaskMesh)

  const bottomSilkscreenMesh = createTexturePlane(
    textures.bottomSilkscreen,
    -pcbThickness / 2 - 0.003,
    true,
    "silkscreen",
    false,
    3,
  )
  if (bottomSilkscreenMesh) meshes.push(bottomSilkscreenMesh)

  const topSoldermaskMesh = createTexturePlane(
    textures.topSoldermask,
    pcbThickness / 2 + 0.001,
    false,
    "soldermask",
    true,
    1,
  )
  if (topSoldermaskMesh) meshes.push(topSoldermaskMesh)

  const bottomSoldermaskMesh = createTexturePlane(
    textures.bottomSoldermask,
    -pcbThickness / 2 - 0.001,
    true,
    "soldermask",
    true,
    1,
  )
  if (bottomSoldermaskMesh) meshes.push(bottomSoldermaskMesh)

  const topCopperTextMesh = createTexturePlane(
    textures.topCopperText,
    pcbThickness / 2 + BOARD_SURFACE_OFFSET.copper,
    false,
    "copper-text",
    false,
    2,
  )
  if (topCopperTextMesh) meshes.push(topCopperTextMesh)

  const bottomCopperTextMesh = createTexturePlane(
    textures.bottomCopperText,
    -pcbThickness / 2 - BOARD_SURFACE_OFFSET.copper,
    true,
    "copper-text",
    false,
    2,
  )
  if (bottomCopperTextMesh) meshes.push(bottomCopperTextMesh)

  const topPanelOutlinesMesh = createTexturePlane(
    textures.topPanelOutlines,
    pcbThickness / 2 + 0.004,
    false,
    "panel-outlines",
    false,
    4,
  )
  if (topPanelOutlinesMesh) meshes.push(topPanelOutlinesMesh)

  const bottomPanelOutlinesMesh = createTexturePlane(
    textures.bottomPanelOutlines,
    -pcbThickness / 2 - 0.004,
    true,
    "panel-outlines",
    false,
    4,
  )
  if (bottomPanelOutlinesMesh) meshes.push(bottomPanelOutlinesMesh)

  return meshes
}
