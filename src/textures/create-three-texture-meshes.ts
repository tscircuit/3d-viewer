import type { PcbBoard } from "circuit-json"
import * as THREE from "three"
import { configureObjectShadows } from "../utils/configure-object-shadows"
import { createBoardShadowReceiverPlane } from "../utils/create-board-shadow-receiver-plane"
import { createBoardTextureMaterial } from "../utils/create-board-texture-material"
import { calculateOutlineBounds } from "../utils/outline-bounds"
import type { CombinedBoardTextures } from "./index"

interface TexturePlaneConfig {
  texture: THREE.CanvasTexture | null | undefined
  yOffset: number
  isBottomLayer: boolean
  usePolygonOffset?: boolean
  renderOrder?: number
  isFaux?: boolean
  reliefEnabled?: boolean
}

function createTexturePlane(
  config: TexturePlaneConfig,
  boardData: PcbBoard,
): THREE.Mesh | null {
  const {
    texture,
    yOffset,
    isBottomLayer,
    usePolygonOffset = false,
    renderOrder = 0,
    isFaux = false,
    reliefEnabled = true,
  } = config

  if (!texture) return null

  // Use board outline bounds for plane geometry to match texture dimensions
  const boardOutlineBounds = calculateOutlineBounds(boardData)
  const planeGeom = new THREE.PlaneGeometry(
    boardOutlineBounds.width,
    boardOutlineBounds.height,
  )
  const material = createBoardTextureMaterial({
    texture,
    side: THREE.FrontSide,
    depthWrite: true,
    polygonOffset: usePolygonOffset,
    polygonOffsetFactor: usePolygonOffset ? -4 : 0,
    polygonOffsetUnits: usePolygonOffset ? -4 : 0,
    isFaux,
    reliefEnabled,
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
  mesh.name = `${isBottomLayer ? "bottom" : "top"}-board-texture-plane`
  mesh.renderOrder = renderOrder
  configureObjectShadows(mesh, { castShadow: false, receiveShadow: true })
  return mesh
}

export function createTextureMeshes(
  textures: CombinedBoardTextures | null,
  boardData: PcbBoard | null,
  pcbThickness: number | null,
  isFaux: boolean = false,
  options: { shadowsEnabled?: boolean; lightingEnabled?: boolean } = {},
): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  if (!textures || !boardData || pcbThickness === null) return meshes
  const SURFACE_OFFSET = 0.005
  const SHADOW_RECEIVER_OFFSET = SURFACE_OFFSET + 0.002

  const topBoardMesh = createTexturePlane(
    {
      texture: textures.topBoard,
      yOffset: pcbThickness / 2 + SURFACE_OFFSET,
      isBottomLayer: false,
      usePolygonOffset: true,
      renderOrder: 1,
      isFaux,
      reliefEnabled: options.lightingEnabled ?? true,
    },
    boardData,
  )
  if (topBoardMesh) meshes.push(topBoardMesh)
  if (options.shadowsEnabled) {
    meshes.push(
      createBoardShadowReceiverPlane({
        boardData,
        offset: pcbThickness / 2 + SHADOW_RECEIVER_OFFSET,
        isBottomLayer: false,
      }),
    )
  }

  const bottomBoardMesh = createTexturePlane(
    {
      texture: textures.bottomBoard,
      yOffset: -pcbThickness / 2 - SURFACE_OFFSET,
      isBottomLayer: true,
      usePolygonOffset: true,
      renderOrder: 1,
      isFaux,
      reliefEnabled: options.lightingEnabled ?? true,
    },
    boardData,
  )
  if (bottomBoardMesh) meshes.push(bottomBoardMesh)
  if (options.shadowsEnabled) {
    meshes.push(
      createBoardShadowReceiverPlane({
        boardData,
        offset: -pcbThickness / 2 - SHADOW_RECEIVER_OFFSET,
        isBottomLayer: true,
      }),
    )
  }

  return meshes
}
