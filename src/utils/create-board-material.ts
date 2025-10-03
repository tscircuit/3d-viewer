import * as THREE from "three"
import type { PcbBoard } from "circuit-json"

type BoardMaterialType = PcbBoard["material"]

interface CreateBoardMaterialOptions {
  material: BoardMaterialType | undefined
  color: THREE.ColorRepresentation
  side?: THREE.Side
}

const DEFAULT_SIDE = THREE.DoubleSide

export const createBoardMaterial = ({
  material,
  color,
  side = DEFAULT_SIDE,
}: CreateBoardMaterialOptions): THREE.MeshStandardMaterial => {
  if (material === "fr4") {
    return new THREE.MeshPhysicalMaterial({
      color,
      side,
      metalness: 0.0,
      roughness: 0.8,
      specularIntensity: 0.2,
      ior: 1.45,
      sheen: 0.0,
      clearcoat: 0.0,
      transparent: false,
      opacity: 1.0,
      flatShading: true,
    })
  }

  return new THREE.MeshStandardMaterial({
    color,
    side,
    flatShading: true,
    metalness: 0.1,
    roughness: 0.8,
    transparent: true,
    opacity: 0.9,
  })
}
