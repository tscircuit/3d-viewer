import * as THREE from "three"
import type { PcbBoard, AnyCircuitElement } from "circuit-json"
import { createTopSideTexture } from "./circuit-to-texture"

type BoardMaterialType = PcbBoard["material"]

interface CreateBoardMaterialOptions {
  material: BoardMaterialType | undefined
  color: THREE.ColorRepresentation
  side?: THREE.Side
  circuitJson?: AnyCircuitElement[]
  enableTexture?: boolean
}

const DEFAULT_SIDE = THREE.DoubleSide

export const createBoardMaterial = async ({
  material,
  color,
  side = DEFAULT_SIDE,
  circuitJson,
  enableTexture = false,
}: CreateBoardMaterialOptions): Promise<THREE.MeshStandardMaterial> => {
  const baseMaterialProps = {
    color,
    side,
    flatShading: true,
  }

  if (material === "fr4") {
    const materialProps = {
      ...baseMaterialProps,
      metalness: 0.0,
      roughness: 0.8,
      specularIntensity: 0.2,
      ior: 1.45,
      sheen: 0.0,
      clearcoat: 0.0,
      transparent: false,
      opacity: 1.0,
    }

    // Add texture if enabled and circuit JSON is available
    if (enableTexture && circuitJson) {
      try {
        const topTexture = await createTopSideTexture(circuitJson, {
          width: 1024,
          height: 1024,
          backgroundColor: "#ffffff",
        })

        return new THREE.MeshPhysicalMaterial({
          ...materialProps,
          map: topTexture,
        })
      } catch (error) {
        console.warn('Failed to create board texture, falling back to solid material:', error)
      }
    }

    return new THREE.MeshPhysicalMaterial(materialProps)
  }

  const materialProps = {
    ...baseMaterialProps,
    metalness: 0.1,
    roughness: 0.8,
    transparent: true,
    opacity: 0.9,
  }

  // Add texture if enabled and circuit JSON is available
  if (enableTexture && circuitJson) {
    try {
      const topTexture = await createTopSideTexture(circuitJson, {
        width: 1024,
        height: 1024,
        backgroundColor: "#ffffff",
      })

      return new THREE.MeshStandardMaterial({
        ...materialProps,
        map: topTexture,
      })
    } catch (error) {
      console.warn('Failed to create board texture, falling back to solid material:', error)
    }
  }

  return new THREE.MeshStandardMaterial(materialProps)
}
