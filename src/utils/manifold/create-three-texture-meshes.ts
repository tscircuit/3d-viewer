import * as THREE from "three"
import type { PcbBoard } from "circuit-json"
import type { ManifoldTextures } from "../../hooks/useManifoldBoardBuilder"
import { BOARD_SURFACE_OFFSET } from "../../geoms/constants"

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
    const planeGeom = new THREE.PlaneGeometry(boardData.width, boardData.height)
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false, // Important for layers to avoid z-fighting issues with board itself
      polygonOffset: usePolygonOffset,
      polygonOffsetFactor: usePolygonOffset ? -4 : 0, // Increased for better z-fighting prevention
      polygonOffsetUnits: usePolygonOffset ? -4 : 0,
    })
    const mesh = new THREE.Mesh(planeGeom, material)
    mesh.position.set(boardData.center.x, boardData.center.y, yOffset)
    if (isBottomLayer) {
      mesh.rotation.set(Math.PI, 0, 0) // Flip for bottom layer
    }
    mesh.name = `${isBottomLayer ? "bottom" : "top"}-${keySuffix}-texture-plane`
    mesh.renderOrder = renderOrder
    return mesh
  }

  const topTraceMesh = createTexturePlane(
    textures.topTrace,
    pcbThickness / 2 + BOARD_SURFACE_OFFSET.traces, // Use consistent copper offset
    false,
    "trace",
    false,
    2, // Render after soldermask
  )
  if (topTraceMesh) meshes.push(topTraceMesh)

  // Trace with mask (light green) - same position, will be toggled based on soldermask visibility
  const topTraceWithMaskMesh = createTexturePlane(
    textures.topTraceWithMask,
    pcbThickness / 2 + BOARD_SURFACE_OFFSET.traces,
    false,
    "trace-with-mask",
    false,
    2, // Render after soldermask
  )
  if (topTraceWithMaskMesh) meshes.push(topTraceWithMaskMesh)

  const topSilkscreenMesh = createTexturePlane(
    textures.topSilkscreen,
    pcbThickness / 2 + 0.003, // Slightly above soldermask
    false,
    "silkscreen",
    false,
    3, // Render after traces
  )
  if (topSilkscreenMesh) meshes.push(topSilkscreenMesh)

  const bottomTraceMesh = createTexturePlane(
    textures.bottomTrace,
    -pcbThickness / 2 - BOARD_SURFACE_OFFSET.traces, // Use consistent copper offset
    true,
    "trace",
    false,
    2, // Render after soldermask
  )
  if (bottomTraceMesh) meshes.push(bottomTraceMesh)

  // Bottom trace with mask (light green)
  const bottomTraceWithMaskMesh = createTexturePlane(
    textures.bottomTraceWithMask,
    -pcbThickness / 2 - BOARD_SURFACE_OFFSET.traces,
    true,
    "trace-with-mask",
    false,
    2, // Render after soldermask
  )
  if (bottomTraceWithMaskMesh) meshes.push(bottomTraceWithMaskMesh)

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

  return meshes
}
