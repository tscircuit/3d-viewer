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
    side: THREE.FrontSide,
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

  const edgeMesh = createBoardEdgeMesh(boardData, pcbThickness)
  meshes.push(edgeMesh)

  return meshes
}

export function createBoardEdgeMesh(
  boardData: PcbBoard,
  pcbThickness: number,
): THREE.Mesh {
  const boardOutlineBounds = calculateOutlineBounds(boardData)
  const { width, height, centerX, centerY } = boardOutlineBounds

  const geometry = new THREE.BoxGeometry(width, height, pcbThickness)

  // Create a canvas texture for the PCB edge (FR4 yellowish-green color)
  const canvas = document.createElement("canvas")
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext("2d")!
  ctx.fillStyle = "#1a3d1a"
  ctx.fillRect(0, 0, 64, 64)
  // Add subtle edge lines to simulate PCB layers
  ctx.strokeStyle = "#0f2610"
  ctx.lineWidth = 3
  ctx.strokeRect(0, 0, 64, 64)
  const edgeTexture = new THREE.CanvasTexture(canvas)

  const materials = [
    new THREE.MeshBasicMaterial({ map: edgeTexture }), // right
    new THREE.MeshBasicMaterial({ map: edgeTexture }), // left
    new THREE.MeshBasicMaterial({ map: edgeTexture }), // top
    new THREE.MeshBasicMaterial({ map: edgeTexture }), // bottom
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }), // front (top face - hidden, texture plane sits here)
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }), // back (bottom face - hidden)
  ]

  const mesh = new THREE.Mesh(geometry, materials)
  mesh.position.set(centerX, centerY, 0)
  mesh.name = "pcb-board-edge-box"
  return mesh
}
