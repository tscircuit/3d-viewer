import type { RGB } from "@jscad/modeling/src/colors"
import type { PcbBoard } from "circuit-json"

export const M = 0.01

export const colors = {
  copper: [0.9, 0.6, 0.2],
  fr4Green: [0.04, 0.16, 0.08],
  fr4GreenSolderWithMask: [0x00 / 255, 0x98 / 255, 0x13 / 255],
  fr1Copper: [0.8, 0.4, 0.2],
  fr1CopperSolderWithMask: [0.9, 0.6, 0.2],
} satisfies Record<string, RGB>

export interface BoardMaterialPhysicalProperties {
  baseColor: RGB
  alpha: number
  metalness: number
  specularIntensity: number
  roughness: number
  ior: number
  sheen: number
  clearcoat: number
}

// Constants for Manifold processing
export const MANIFOLD_Z_OFFSET = 0.001 // Small offset to prevent Z-fighting
export const SMOOTH_CIRCLE_SEGMENTS = 32 // Number of segments for smooth circles
export const DEFAULT_SMT_PAD_THICKNESS = 0.035 // Typical 1oz copper thickness in mm
export const TRACE_TEXTURE_RESOLUTION = 50 // pixels per mm for trace texture
export const boardMaterialPhysicalProperties: Record<
  PcbBoard["material"],
  BoardMaterialPhysicalProperties
> = {
  fr1: {
    baseColor: colors.fr1Copper,
    alpha: 1,
    metalness: 0.2,
    specularIntensity: 0.3,
    roughness: 0.6,
    ior: 1.5,
    sheen: 0,
    clearcoat: 0,
  },
  fr4: {
    baseColor: colors.fr4Green,
    alpha: 1,
    metalness: 0,
    specularIntensity: 0.2,
    roughness: 0.8,
    ior: 1.45,
    sheen: 0,
    clearcoat: 0,
  },
}

export const boardMaterialColors: Record<PcbBoard["material"], RGB> = {
  fr1: boardMaterialPhysicalProperties.fr1.baseColor,
  fr4: boardMaterialPhysicalProperties.fr4.baseColor,
}

export const tracesMaterialColors: Record<PcbBoard["material"], RGB> = {
  fr1: colors.fr1CopperSolderWithMask,
  fr4: colors.fr4GreenSolderWithMask,
}
