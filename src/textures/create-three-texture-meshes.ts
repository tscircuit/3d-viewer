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

  const boardOutlineBounds = calculateOutlineBounds(boardData)
  const { width, height, centerX, centerY } = boardOutlineBounds

  // Create the box geometry for the PCB substrate
  const boxGeom = new THREE.BoxGeometry(width, pcbThickness, height)

  // Define materials for each face of the box
  // Order: right, left, top, bottom, front, back
  const sideMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e1e1e, // Dark substrate color
    roughness: 0.6,
    metalness: 0.1,
  })

  const topMaterial = textures.topBoard
    ? new THREE.MeshBasicMaterial({
        map: textures.topBoard,
        transparent: true,
        alphaTest: 0.08,
        opacity: isFaux ? FAUX_BOARD_OPACITY : 1.0,
      })
    : sideMaterial

  const bottomMaterial = textures.bottomBoard
    ? new THREE.MeshBasicMaterial({
        map: textures.bottomBoard,
        transparent: true,
        alphaTest: 0.08,
        opacity: isFaux ? FAUX_BOARD_OPACITY : 1.0,
      })
    : sideMaterial

  const materials = [
    sideMaterial, // right
    sideMaterial, // left
    topMaterial, // top
    bottomMaterial, // bottom
    sideMaterial, // front
    sideMaterial, // back
  ]

  const pcbBox = new THREE.Mesh(boxGeom, materials)
  pcbBox.position.set(centerX, centerY, 0)
  pcbBox.name = "pcb-board-box"

  meshes.push(pcbBox)

  return meshes
}
