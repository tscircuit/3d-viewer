import type { PcbBoard } from "circuit-json"
import * as THREE from "three"
import { FAUX_BOARD_OPACITY } from "../geoms/constants"
import { calculateOutlineBounds } from "../utils/outline-bounds"
import type { CombinedBoardTextures } from "./index"

interface TexturePlaneConfig {
  texture: THREE.CanvasTexture | null | undefined
  yOffset: number
  isBottomLayer: boolean
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
    alphaTest: 0.08,
    side: THREE.DoubleSide,
    depthWrite: true,
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
  mesh.name = `${isBottomLayer ? "bottom" : "top"}-board-texture-plane`
  mesh.renderOrder = renderOrder
  return mesh
}

export function createTextureMeshes(
  textures: CombinedBoardTextures | null,
  boardData: PcbBoard | null,
  pcbThickness: number | null,
  isFaux: boolean = false,
): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  if (!textures || !boardData || pcbThickness === null) return meshes
  const SURFACE_OFFSET = 0.005

  const topBoardMesh = createTexturePlane(
    {
      texture: textures.topBoard,
      yOffset: pcbThickness / 2 + SURFACE_OFFSET,
      isBottomLayer: false,
      usePolygonOffset: true,
      renderOrder: 1,
      isFaux,
    },
    boardData,
  )
  if (topBoardMesh) meshes.push(topBoardMesh)

  const bottomBoardMesh = createTexturePlane(
    {
      texture: textures.bottomBoard,
      yOffset: -pcbThickness / 2 - SURFACE_OFFSET,
      isBottomLayer: true,
      usePolygonOffset: true,
      renderOrder: 1,
      isFaux,
    },
    boardData,
  )
  if (bottomBoardMesh) meshes.push(bottomBoardMesh)

  // Apply texture to the box mesh
  const boardOutlineBounds = calculateOutlineBounds(boardData)
  const boxGeom = new THREE.BoxGeometry(
    boardOutlineBounds.width,
    boardOutlineBounds.height,
    pcbThickness,
  )

  // Create materials for the box: right, left, top, bottom, front, back
  // We apply the board texture to the top (index 2) and bottom (index 3) faces
  const sideMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 })
  const topMaterial = textures.topBoard
    ? new THREE.MeshBasicMaterial({ map: textures.topBoard })
    : sideMaterial
  const bottomMaterial = textures.bottomBoard
    ? new THREE.MeshBasicMaterial({ map: textures.bottomBoard })
    : sideMaterial

  const boxMesh = new THREE.Mesh(boxGeom, [
    sideMaterial, // right
    sideMaterial, // left
    topMaterial, // top
    bottomMaterial, // bottom
    sideMaterial, // front
    sideMaterial, // back
  ])

  boxMesh.position.set(
    boardOutlineBounds.centerX,
    boardOutlineBounds.centerY,
    0,
  )
  boxMesh.name = "board-texture-box"
  meshes.push(boxMesh)

  return meshes
}
