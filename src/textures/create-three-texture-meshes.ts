import * as THREE from "three"
import type { PcbBoard } from "circuit-json"
import type { LayerTextures } from "./index"
import { BOARD_SURFACE_OFFSET, FAUX_BOARD_OPACITY } from "../geoms/constants"
import { calculateOutlineBounds } from "../utils/outline-bounds"

type TextureType =
  | "trace"
  | "trace-with-mask"
  | "silkscreen"
  | "soldermask"
  | "copper-text"
  | "copper"
  | "panel-outlines"

interface TexturePlaneConfig {
  texture: THREE.CanvasTexture | null | undefined
  yOffset: number
  isBottomLayer: boolean
  textureType: TextureType
  usePolygonOffset?: boolean
  renderOrder?: number
  isFaux?: boolean
}

function createTexturePlane(
  config: TexturePlaneConfig,
  boardData: PcbBoard,
): THREE.Mesh | null {
  const {
    texture,
    yOffset,
    isBottomLayer,
    textureType,
    usePolygonOffset = false,
    renderOrder = 0,
    isFaux = false,
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
    depthWrite: textureType === "panel-outlines",
    polygonOffset: usePolygonOffset,
    polygonOffsetFactor: usePolygonOffset ? -4 : 0, // Increased for better z-fighting prevention
    polygonOffsetUnits: usePolygonOffset ? -4 : 0,
    opacity: isFaux ? FAUX_BOARD_OPACITY : 1.0,
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
  mesh.name = `${isBottomLayer ? "bottom" : "top"}-${textureType}-texture-plane`
  mesh.renderOrder = renderOrder
  return mesh
}

export function createTextureMeshes(
  textures: LayerTextures | null,
  boardData: PcbBoard | null,
  pcbThickness: number | null,
  isFaux: boolean = false,
): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  if (!textures || !boardData || pcbThickness === null) return meshes

  const topTraceMesh = createTexturePlane(
    {
      texture: textures.topTrace,
      yOffset: pcbThickness / 2 + BOARD_SURFACE_OFFSET.traces, // Use consistent copper offset
      isBottomLayer: false,
      textureType: "trace",
      usePolygonOffset: false,
      renderOrder: 2, // Render after soldermask
      isFaux,
    },
    boardData,
  )
  if (topTraceMesh) meshes.push(topTraceMesh)

  // Trace with mask (light green) - same position, will be toggled based on soldermask visibility
  const topTraceWithMaskMesh = createTexturePlane(
    {
      texture: textures.topTraceWithMask,
      yOffset: pcbThickness / 2 + BOARD_SURFACE_OFFSET.traces,
      isBottomLayer: false,
      textureType: "trace-with-mask",
      usePolygonOffset: false,
      renderOrder: 2, // Render after soldermask
      isFaux,
    },
    boardData,
  )
  if (topTraceWithMaskMesh) meshes.push(topTraceWithMaskMesh)

  const topSilkscreenMesh = createTexturePlane(
    {
      texture: textures.topSilkscreen,
      yOffset: pcbThickness / 2 + 0.003, // Slightly above soldermask
      isBottomLayer: false,
      textureType: "silkscreen",
      usePolygonOffset: false,
      renderOrder: 3, // Render after traces
      isFaux,
    },
    boardData,
  )
  if (topSilkscreenMesh) meshes.push(topSilkscreenMesh)

  const bottomTraceMesh = createTexturePlane(
    {
      texture: textures.bottomTrace,
      yOffset: -pcbThickness / 2 - BOARD_SURFACE_OFFSET.traces, // Use consistent copper offset
      isBottomLayer: true,
      textureType: "trace",
      usePolygonOffset: false,
      renderOrder: 2, // Render after soldermask
      isFaux,
    },
    boardData,
  )
  if (bottomTraceMesh) meshes.push(bottomTraceMesh)

  // Bottom trace with mask (light green)
  const bottomTraceWithMaskMesh = createTexturePlane(
    {
      texture: textures.bottomTraceWithMask,
      yOffset: -pcbThickness / 2 - BOARD_SURFACE_OFFSET.traces,
      isBottomLayer: true,
      textureType: "trace-with-mask",
      usePolygonOffset: false,
      renderOrder: 2, // Render after soldermask
      isFaux,
    },
    boardData,
  )
  if (bottomTraceWithMaskMesh) meshes.push(bottomTraceWithMaskMesh)

  const bottomSilkscreenMesh = createTexturePlane(
    {
      texture: textures.bottomSilkscreen,
      yOffset: -pcbThickness / 2 - 0.003,
      isBottomLayer: true,
      textureType: "silkscreen",
      usePolygonOffset: false,
      renderOrder: 3, // Render after traces
      isFaux,
    },
    boardData,
  )
  if (bottomSilkscreenMesh) meshes.push(bottomSilkscreenMesh)

  // Soldermask meshes - positioned at board surface
  // Use polygonOffset to prevent Z-fighting with the board surface

  const topSoldermaskMesh = createTexturePlane(
    {
      texture: textures.topSoldermask,
      yOffset: pcbThickness / 2 + 0.001 + 0.02, // Just above board surface
      isBottomLayer: false,
      textureType: "soldermask",
      usePolygonOffset: true, // Enable polygon offset
      renderOrder: 1, // Render after board (renderOrder)
      isFaux,
    },
    boardData,
  )
  if (topSoldermaskMesh) meshes.push(topSoldermaskMesh)

  const bottomSoldermaskMesh = createTexturePlane(
    {
      texture: textures.bottomSoldermask,
      yOffset: -pcbThickness / 2 - 0.001 - 0.02, // Just below board surface (bottom side)
      isBottomLayer: true,
      textureType: "soldermask",
      usePolygonOffset: true, // Enable polygon offset
      renderOrder: 1, // Render after board (renderOrder)
      isFaux,
    },
    boardData,
  )
  if (bottomSoldermaskMesh) meshes.push(bottomSoldermaskMesh)

  // Copper text meshes - positioned at copper layer (same as traces/pads)
  const topCopperTextMesh = createTexturePlane(
    {
      texture: textures.topCopperText,
      yOffset: pcbThickness / 2 + BOARD_SURFACE_OFFSET.copper,
      isBottomLayer: false,
      textureType: "copper-text",
      usePolygonOffset: false,
      renderOrder: 2, // Render after soldermask
      isFaux,
    },
    boardData,
  )
  if (topCopperTextMesh) meshes.push(topCopperTextMesh)

  const bottomCopperTextMesh = createTexturePlane(
    {
      texture: textures.bottomCopperText,
      yOffset: -pcbThickness / 2 - BOARD_SURFACE_OFFSET.copper,
      isBottomLayer: true,
      textureType: "copper-text",
      usePolygonOffset: false,
      renderOrder: 2, // Render after soldermask
      isFaux,
    },
    boardData,
  )
  if (bottomCopperTextMesh) meshes.push(bottomCopperTextMesh)

  // Copper pour meshes - positioned at copper layer (same as traces/pads)
  const topCopperMesh = createTexturePlane(
    {
      texture: textures.topCopper,
      yOffset: pcbThickness / 2 + BOARD_SURFACE_OFFSET.copper,
      isBottomLayer: false,
      textureType: "copper",
      usePolygonOffset: false,
      renderOrder: 2, // Render after soldermask
      isFaux,
    },
    boardData,
  )
  if (topCopperMesh) meshes.push(topCopperMesh)

  const bottomCopperMesh = createTexturePlane(
    {
      texture: textures.bottomCopper,
      yOffset: -pcbThickness / 2 - BOARD_SURFACE_OFFSET.copper,
      isBottomLayer: true,
      textureType: "copper",
      usePolygonOffset: false,
      renderOrder: 2, // Render after soldermask
      isFaux,
    },
    boardData,
  )
  if (bottomCopperMesh) meshes.push(bottomCopperMesh)

  const topPanelOutlinesMesh = createTexturePlane(
    {
      texture: textures.topPanelOutlines,
      yOffset: pcbThickness / 2 + 0.004, // Above silkscreen
      isBottomLayer: false,
      textureType: "panel-outlines",
      usePolygonOffset: false,
      renderOrder: 4,
      isFaux,
    },
    boardData,
  )
  if (topPanelOutlinesMesh) meshes.push(topPanelOutlinesMesh)

  const bottomPanelOutlinesMesh = createTexturePlane(
    {
      texture: textures.bottomPanelOutlines,
      yOffset: -pcbThickness / 2 - 0.004, // Below bottom silkscreen
      isBottomLayer: true,
      textureType: "panel-outlines",
      usePolygonOffset: false,
      renderOrder: 4,
      isFaux,
    },
    boardData,
  )
  if (bottomPanelOutlinesMesh) meshes.push(bottomPanelOutlinesMesh)

  return meshes
}
