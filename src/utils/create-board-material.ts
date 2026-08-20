import type { PcbBoard } from "circuit-json"
import * as THREE from "three"
import { FAUX_BOARD_OPACITY } from "../geoms/constants"

type BoardMaterialType = PcbBoard["material"]

interface CreateBoardMaterialOptions {
  material: BoardMaterialType | undefined
  color: THREE.ColorRepresentation
  side?: THREE.Side
  isFaux?: boolean
}

const DEFAULT_SIDE = THREE.DoubleSide

export const createBoardMaterial = ({
  material,
  color,
  side = DEFAULT_SIDE,
  isFaux = false,
}: CreateBoardMaterialOptions): THREE.MeshStandardMaterial => {
  if (material === "fr4") {
    return new THREE.MeshPhysicalMaterial({
      color,
      side,
      metalness: 0.0,
      roughness: 0.48,
      specularIntensity: 0.3,
      ior: 1.45,
      sheen: 0.0,
      clearcoat: 0.16,
      clearcoatRoughness: 0.3,
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
