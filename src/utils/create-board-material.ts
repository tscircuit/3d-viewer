import * as THREE from "three"
import type { PcbBoard } from "circuit-json"
import { FAUX_BOARD_OPACITY } from "../geoms/constants"

type BoardMaterialType = PcbBoard["material"]

interface CreateBoardMaterialOptions {
  material: BoardMaterialType | undefined
  color: THREE.ColorRepresentation
  side?: THREE.Side
  isFaux?: boolean
  topMap?: THREE.Texture | null
  bottomMap?: THREE.Texture | null
  sideMap?: THREE.Texture | null
}

const DEFAULT_SIDE = THREE.DoubleSide

export const createBoardMaterial = ({
  material,
  color,
  side = DEFAULT_SIDE,
  isFaux = false,
  topMap,
  bottomMap,
  sideMap,
}: CreateBoardMaterialOptions): THREE.Material | THREE.Material[] => {
  const baseOptions = {
    side,
    flatShading: true,
    transparent: isFaux || Boolean(topMap || bottomMap || sideMap),
    opacity: isFaux ? FAUX_BOARD_OPACITY : 1.0,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  }

  const createMaterial = (map?: THREE.Texture | null) => {
    if (material === "fr4") {
      return new THREE.MeshPhysicalMaterial({
        ...baseOptions,
        color: map ? "#ffffff" : color,
        map: map || null,
        metalness: 0.0,
        roughness: 0.8,
        specularIntensity: 0.2,
        ior: 1.45,
      })
    }
    return new THREE.MeshStandardMaterial({
      ...baseOptions,
      color: map ? "#ffffff" : color,
      map: map || null,
      metalness: 0.1,
      roughness: 0.8,
    })
  }

  if (topMap || bottomMap || sideMap) {
    return [
      createMaterial(topMap), // Group 0: Top
      createMaterial(bottomMap), // Group 1: Bottom
      createMaterial(sideMap), // Group 2: Sides
    ]
  }

  return createMaterial(null)
}
