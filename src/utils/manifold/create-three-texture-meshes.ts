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

  interface TexturePlaneConfig {
    texture: THREE.CanvasTexture | null | undefined
    yOffset: number
    isBottomLayer: boolean
    keySuffix: string
    usePolygonOffset?: boolean
    renderOrder?: number
  }

  const createTexturePlane = (config: TexturePlaneConfig) => {
    const {
      texture,
      yOffset,
      isBottomLayer,
      keySuffix,
      usePolygonOffset = false,
      renderOrder = 0,
    } = config

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

  const topTraceMesh = createTexturePlane({
    texture: textures.topTrace,
    yOffset: pcbThickness / 2 + BOARD_SURFACE_OFFSET.traces, // Use consistent copper offset
    isBottomLayer: false,
    keySuffix: "trace",
    usePolygonOffset: false,
    renderOrder: 2, // Render after soldermask
  })
  if (topTraceMesh) meshes.push(topTraceMesh)

  // Trace with mask (light green) - same position, will be toggled based on soldermask visibility
  const topTraceWithMaskMesh = createTexturePlane({
    texture: textures.topTraceWithMask,
    yOffset: pcbThickness / 2 + BOARD_SURFACE_OFFSET.traces,
    isBottomLayer: false,
    keySuffix: "trace-with-mask",
    usePolygonOffset: false,
    renderOrder: 2, // Render after soldermask
  })
  if (topTraceWithMaskMesh) meshes.push(topTraceWithMaskMesh)

  const topSilkscreenMesh = createTexturePlane({
    texture: textures.topSilkscreen,
    yOffset: pcbThickness / 2 + 0.003, // Slightly above soldermask
    isBottomLayer: false,
    keySuffix: "silkscreen",
    usePolygonOffset: false,
    renderOrder: 3, // Render after traces
  })
  if (topSilkscreenMesh) meshes.push(topSilkscreenMesh)

  const bottomTraceMesh = createTexturePlane({
    texture: textures.bottomTrace,
    yOffset: -pcbThickness / 2 - BOARD_SURFACE_OFFSET.traces, // Use consistent copper offset
    isBottomLayer: true,
    keySuffix: "trace",
    usePolygonOffset: false,
    renderOrder: 2, // Render after soldermask
  })
  if (bottomTraceMesh) meshes.push(bottomTraceMesh)

  // Bottom trace with mask (light green)
  const bottomTraceWithMaskMesh = createTexturePlane({
    texture: textures.bottomTraceWithMask,
    yOffset: -pcbThickness / 2 - BOARD_SURFACE_OFFSET.traces,
    isBottomLayer: true,
    keySuffix: "trace-with-mask",
    usePolygonOffset: false,
    renderOrder: 2, // Render after soldermask
  })
  if (bottomTraceWithMaskMesh) meshes.push(bottomTraceWithMaskMesh)

  const bottomSilkscreenMesh = createTexturePlane({
    texture: textures.bottomSilkscreen,
    yOffset: -pcbThickness / 2 - 0.003,
    isBottomLayer: true,
    keySuffix: "silkscreen",
    usePolygonOffset: false,
    renderOrder: 3, // Render after traces
  })
  if (bottomSilkscreenMesh) meshes.push(bottomSilkscreenMesh)

  // Soldermask meshes - positioned at board surface
  // Use polygonOffset to prevent Z-fighting with the board surface

  const topSoldermaskMesh = createTexturePlane({
    texture: textures.topSoldermask,
    yOffset: pcbThickness / 2 + 0.001, // Just above board surface
    isBottomLayer: false,
    keySuffix: "soldermask",
    usePolygonOffset: true, // Enable polygon offset
    renderOrder: 1, // Render after board (renderOrder)
  })
  if (topSoldermaskMesh) meshes.push(topSoldermaskMesh)

  const bottomSoldermaskMesh = createTexturePlane({
    texture: textures.bottomSoldermask,
    yOffset: -pcbThickness / 2 - 0.001, // Just below board surface (bottom side)
    isBottomLayer: true,
    keySuffix: "soldermask",
    usePolygonOffset: true, // Enable polygon offset
    renderOrder: 1, // Render after board (renderOrder)
  })
  if (bottomSoldermaskMesh) meshes.push(bottomSoldermaskMesh)

  // Copper text meshes - positioned at copper layer (same as traces/pads)
  const topCopperTextMesh = createTexturePlane({
    texture: textures.topCopperText,
    yOffset: pcbThickness / 2 + BOARD_SURFACE_OFFSET.copper,
    isBottomLayer: false,
    keySuffix: "copper-text",
    usePolygonOffset: false,
    renderOrder: 2, // Render after soldermask
  })
  if (topCopperTextMesh) meshes.push(topCopperTextMesh)

  const bottomCopperTextMesh = createTexturePlane({
    texture: textures.bottomCopperText,
    yOffset: -pcbThickness / 2 - BOARD_SURFACE_OFFSET.copper,
    isBottomLayer: true,
    keySuffix: "copper-text",
    usePolygonOffset: false,
    renderOrder: 2, // Render after soldermask
  })
  if (bottomCopperTextMesh) meshes.push(bottomCopperTextMesh)

  // Copper pour meshes - positioned at copper layer (same as traces/pads)
  const topCopperMesh = createTexturePlane({
    texture: textures.topCopper,
    yOffset: pcbThickness / 2 + BOARD_SURFACE_OFFSET.copper,
    isBottomLayer: false,
    keySuffix: "copper",
    usePolygonOffset: false,
    renderOrder: 2, // Render after soldermask
  })
  if (topCopperMesh) meshes.push(topCopperMesh)

  const bottomCopperMesh = createTexturePlane({
    texture: textures.bottomCopper,
    yOffset: -pcbThickness / 2 - BOARD_SURFACE_OFFSET.copper,
    isBottomLayer: true,
    keySuffix: "copper",
    usePolygonOffset: false,
    renderOrder: 2, // Render after soldermask
  })
  if (bottomCopperMesh) meshes.push(bottomCopperMesh)

  const topPanelOutlinesMesh = createTexturePlane({
    texture: textures.topPanelOutlines,
    yOffset: pcbThickness / 2 + 0.004, // Above silkscreen
    isBottomLayer: false,
    keySuffix: "panel-outlines",
    usePolygonOffset: false,
    renderOrder: 4,
  })
  if (topPanelOutlinesMesh) meshes.push(topPanelOutlinesMesh)

  const bottomPanelOutlinesMesh = createTexturePlane({
    texture: textures.bottomPanelOutlines,
    yOffset: -pcbThickness / 2 - 0.004, // Below bottom silkscreen
    isBottomLayer: true,
    keySuffix: "panel-outlines",
    usePolygonOffset: false,
    renderOrder: 4,
  })
  if (bottomPanelOutlinesMesh) meshes.push(bottomPanelOutlinesMesh)

  return meshes
}
