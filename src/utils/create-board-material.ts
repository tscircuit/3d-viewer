import * as THREE from "three"
import type { PcbBoard } from "circuit-json"
import type { RenderingMode } from "../contexts/RenderingModeContext"
import { FAUX_BOARD_OPACITY } from "../geoms/constants"

type BoardMaterialType = PcbBoard["material"]

interface CreateBoardMaterialOptions {
  material: BoardMaterialType | undefined
  color: THREE.ColorRepresentation
  side?: THREE.Side
  isFaux?: boolean
  renderingMode?: RenderingMode
}

const DEFAULT_SIDE = THREE.DoubleSide

export const createBoardMaterial = ({
  material,
  color,
  side = DEFAULT_SIDE,
  isFaux = false,
  renderingMode = "engineering",
}: CreateBoardMaterialOptions): THREE.MeshStandardMaterial => {
  if (material === "fr4") {
    return new THREE.MeshPhysicalMaterial({
      // A dark edge lets the green solder mask read as a finished PCB rather
      // than a tan substrate with a decal placed on top.
      color: renderingMode === "realistic" ? 0x103a26 : color,
      side,
      metalness: 0.0,
      roughness: renderingMode === "realistic" ? 0.48 : 0.8,
      specularIntensity: renderingMode === "realistic" ? 0.3 : 0.2,
      ior: 1.45,
      sheen: 0.0,
      clearcoat: renderingMode === "realistic" ? 0.16 : 0.0,
      clearcoatRoughness: renderingMode === "realistic" ? 0.3 : 0.0,
      transparent: isFaux,
      opacity: isFaux ? FAUX_BOARD_OPACITY : 1.0,
      flatShading: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    })
  }

  return new THREE.MeshStandardMaterial({
    color,
    side,
    flatShading: true,
    metalness: 0.1,
    roughness: 0.8,
    transparent: true,
    opacity: isFaux ? FAUX_BOARD_OPACITY : 0.9,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })
}
