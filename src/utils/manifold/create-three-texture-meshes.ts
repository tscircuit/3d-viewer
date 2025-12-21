import * as THREE from "three"
import type { PcbBoard } from "circuit-json"
import type { ManifoldTextures } from "../../hooks/useManifoldBoardBuilder"
import { BOARD_SURFACE_OFFSET } from "../../geoms/constants"
import { calculateOutlineBounds } from "../outline-bounds"

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

    // Use board outline bounds for plane geometry to match texture dimensions
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
      polygonOffsetFactor: usePolygonOffset ? -4 : 0, // Increased for better z-fighting prevention
      polygonOffsetUnits: usePolygonOffset ? -4 : 0,
    })
    const mesh = new THREE.Mesh(planeGeom, material)
    mesh.position.set(
      boardOutlineBounds.centerX,
      boardOutlineBounds.centerY,
      yOffset,
    )
    if (isBottomLayer) {
      mesh.rotation.set(Math.PI, 0, 0) // Flip for bottom layer
    }
    mesh.name = `${isBottomLayer ? "bottom" : "top"}-${keySuffix}-texture-plane`
    mesh.renderOrder = renderOrder
    return mesh
  }

  const topCopperMesh = createTexturePlane(
    textures.topCopper,
    pcbThickness / 2 + BOARD_SURFACE_OFFSET.traces, // Use consistent copper offset
    false,
    "copper",
    false,
    2, // Render after soldermask
  )
  if (topCopperMesh) meshes.push(topCopperMesh)

  // Copper with mask (light green) - same position, will be toggled based on soldermask visibility
  const topCopperWithMaskMesh = createTexturePlane(
    textures.topTraceWithMask,
    pcbThickness / 2 + BOARD_SURFACE_OFFSET.traces,
    false,
    "copper-with-mask",
    false,
    2, // Render after soldermask
  )
  if (topCopperWithMaskMesh) meshes.push(topCopperWithMaskMesh)

  const topSilkscreenMesh = createTexturePlane(
    textures.topSilkscreen,
    pcbThickness / 2 + 0.003, // Slightly above soldermask
    false,
    "silkscreen",
    false,
    3, // Render after traces
  )
  if (topSilkscreenMesh) meshes.push(topSilkscreenMesh)

  const bottomCopperMesh = createTexturePlane(
    textures.bottomCopper,
    -pcbThickness / 2 - BOARD_SURFACE_OFFSET.traces, // Use consistent copper offset
    true,
    "copper",
    false,
    2, // Render after soldermask
  )
  if (bottomCopperMesh) meshes.push(bottomCopperMesh)

  // Bottom copper with mask (light green)
  const bottomCopperWithMaskMesh = createTexturePlane(
    textures.bottomTraceWithMask,
    -pcbThickness / 2 - BOARD_SURFACE_OFFSET.traces,
    true,
    "copper-with-mask",
    false,
    2, // Render after soldermask
  )
  if (bottomCopperWithMaskMesh) meshes.push(bottomCopperWithMaskMesh)

  const bottomSilkscreenMesh = createTexturePlane(
    textures.bottomSilkscreen,
    -pcbThickness / 2 - 0.003,
    true,
    "silkscreen",
    false,
    3, // Render after traces
  )
  if (bottomSilkscreenMesh) meshes.push(bottomSilkscreenMesh)

  // Soldermask meshes - positioned at board surface
  // Use polygonOffset to prevent Z-fighting with the board surface

  const topSoldermaskMesh = createTexturePlane(
    textures.topSoldermask,
    pcbThickness / 2 + 0.001, // Just above board surface
    false,
    "soldermask",
    true, // Enable polygon offset
    1, // Render after board (renderOrder)
  )
  if (topSoldermaskMesh) meshes.push(topSoldermaskMesh)

  const bottomSoldermaskMesh = createTexturePlane(
    textures.bottomSoldermask,
    -pcbThickness / 2 - 0.001, // Just below board surface (bottom side)
    true,
    "soldermask",
    true, // Enable polygon offset
    1, // Render after board (renderOrder)
  )
  if (bottomSoldermaskMesh) meshes.push(bottomSoldermaskMesh)

  // Copper text meshes - positioned at copper layer (same as traces/pads)
  const topCopperTextMesh = createTexturePlane(
    textures.topCopperText,
    pcbThickness / 2 + BOARD_SURFACE_OFFSET.copper,
    false,
    "copper-text",
    false,
    2, // Render after soldermask
  )
  if (topCopperTextMesh) meshes.push(topCopperTextMesh)

  const bottomCopperTextMesh = createTexturePlane(
    textures.bottomCopperText,
    -pcbThickness / 2 - BOARD_SURFACE_OFFSET.copper,
    true,
    "copper-text",
    false,
    2, // Render after soldermask
  )
  if (bottomCopperTextMesh) meshes.push(bottomCopperTextMesh)

  const topPanelOutlinesMesh = createTexturePlane(
    textures.topPanelOutlines,
    pcbThickness / 2 + 0.004, // Above silkscreen
    false,
    "panel-outlines",
    false,
    4,
  )
  if (topPanelOutlinesMesh) meshes.push(topPanelOutlinesMesh)

  const bottomPanelOutlinesMesh = createTexturePlane(
    textures.bottomPanelOutlines,
    -pcbThickness / 2 - 0.004, // Below bottom silkscreen
    true,
    "panel-outlines",
    false,
    4,
  )
  if (bottomPanelOutlinesMesh) meshes.push(bottomPanelOutlinesMesh)

  return meshes
}
