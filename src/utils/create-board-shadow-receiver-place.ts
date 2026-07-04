import * as THREE from "three"
import type { PcbBoard } from "circuit-json"
import { calculateOutlineBounds } from "./outline-bounds"
import { configureObjectShadows } from "./configure-object-shadows"

type BoardShadowReceiverOptions = {
  boardData: PcbBoard
  offset: number
  isBottomLayer: boolean
  name?: string
  renderOrder?: number
  frustumCulled?: boolean
}

export const createBoardShadowReceiverPlane = ({
  boardData,
  offset,
  isBottomLayer,
  name,
  renderOrder = 2,
  frustumCulled,
}: BoardShadowReceiverOptions): THREE.Mesh => {
  const boardOutlineBounds = calculateOutlineBounds(boardData)
  const planeGeom = new THREE.PlaneGeometry(
    boardOutlineBounds.width,
    boardOutlineBounds.height,
  )
  const material = new THREE.ShadowMaterial({
    color: 0x000000,
    opacity: 0.24,
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -8,
    polygonOffsetUnits: -8,
  })
  const mesh = new THREE.Mesh(planeGeom, material)
  mesh.position.set(
    boardOutlineBounds.centerX,
    boardOutlineBounds.centerY,
    offset,
  )
  if (isBottomLayer) {
    mesh.rotation.set(Math.PI, 0, 0)
  }
  mesh.name =
    name ?? `${isBottomLayer ? "bottom" : "top"}-board-shadow-receiver`
  mesh.renderOrder = renderOrder
  if (frustumCulled !== undefined) {
    mesh.frustumCulled = frustumCulled
  }
  configureObjectShadows(mesh, { castShadow: false, receiveShadow: true })
  return mesh
}
