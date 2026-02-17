import * as THREE from "three"
import type { PcbBoard } from "circuit-json"
import { FAUX_BOARD_OPACITY } from "../geoms/constants"

type BoardMaterialType = PcbBoard["material"]

interface CreateBoardMaterialOptions {
  material: BoardMaterialType | undefined
  color: THREE.ColorRepresentation
  side?: THREE.Side
  isFaux?: boolean
  map?: THREE.Texture | null
}

const DEFAULT_SIDE = THREE.DoubleSide

export const createBoardMaterial = ({
  material,
  color,
  side = DEFAULT_SIDE,
  isFaux = false,
  map = null,
}: CreateBoardMaterialOptions): THREE.MeshStandardMaterial => {
  if (material === "fr4") {
    return new THREE.MeshPhysicalMaterial({
      color: map ? 0xffffff : color,
      side,
      map: map ?? undefined,
      metalness: 0.0,
      roughness: 0.8,
      specularIntensity: 0.2,
      ior: 1.45,
      sheen: 0.0,
      clearcoat: 0.0,
      transparent: isFaux,
      opacity: isFaux ? FAUX_BOARD_OPACITY : 1.0,
      flatShading: !map,
    })
  }

  return new THREE.MeshStandardMaterial({
    color: map ? 0xffffff : color,
    side,
    map: map ?? undefined,
    flatShading: !map,
    metalness: 0.1,
    roughness: 0.8,
    transparent: true,
    opacity: isFaux ? FAUX_BOARD_OPACITY : 0.9,
  })
}
