import type { PcbBoard } from "circuit-json"
import * as THREE from "three"
import { REALISTIC_BOARD_SURFACE_MATERIAL } from "../board-surface-textures"
import { FAUX_BOARD_OPACITY } from "../geoms/constants"
import { configureObjectShadows } from "../utils/configure-object-shadows"
import { createBoardReliefTextures } from "../utils/create-board-relief-textures"
import { createBoardShadowReceiverPlane } from "../utils/create-board-shadow-receiver-plane"
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
  texture.colorSpace = THREE.SRGBColorSpace

  const sharedMaterialOptions = {
    map: texture,
    transparent: true,
    alphaTest: 0.08,
    side: THREE.FrontSide,
    depthWrite: true,
    polygonOffset: usePolygonOffset,
    polygonOffsetFactor: usePolygonOffset ? -4 : 0,
    polygonOffsetUnits: usePolygonOffset ? -4 : 0,
    opacity: isFaux ? FAUX_BOARD_OPACITY : 1.0,
  } satisfies THREE.MeshBasicMaterialParameters

  const reliefTextures = createBoardReliefTextures(texture)
  const surfaceMaterial = REALISTIC_BOARD_SURFACE_MATERIAL

  const material = new THREE.MeshPhysicalMaterial({
    ...sharedMaterialOptions,
    bumpMap: reliefTextures?.bumpMap ?? null,
    bumpScale: surfaceMaterial.bumpScale,
    normalMap: reliefTextures?.normalMap ?? null,
    normalScale: new THREE.Vector2(
      surfaceMaterial.normalScale,
      surfaceMaterial.normalScale,
    ),
    roughnessMap: reliefTextures?.roughnessMap ?? null,
    // The relief maps carry the material values per pixel: matte solder mask
    // and ENIG-finished exposed copper need different responses.
    roughness: 1,
    metalnessMap: reliefTextures?.metalnessMap ?? null,
    metalness: 1,
    clearcoat: surfaceMaterial.clearcoat,
    clearcoatRoughness: surfaceMaterial.clearcoatRoughness,
    envMapIntensity: 0.85,
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
  options: {
    shadowsEnabled?: boolean
  } = {},
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
