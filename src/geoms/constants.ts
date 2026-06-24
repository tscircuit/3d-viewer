import type { RGB } from "@jscad/modeling/src/colors"
import type { PcbBoard } from "circuit-json"

export const M = 0.01

export const colors = {
  copper: [0.9, 0.6, 0.2],
  fr4Tan: [0.6, 0.43, 0.28],
  fr4SolderMaskGreen: [0.015, 0.059, 0.027],
  fr4TracesWithMaskGreen: [0.063, 0.141, 0.023],
  fr4TracesWithoutMaskTan: [0.6, 0.43, 0.28],
  fr1Tan: [0.8, 0.4, 0.2],
  fr1TracesWithMaskCopper: [0.9, 0.6, 0.2],
  fr1SolderMaskGreen: [0.02, 0.1, 0.04],
} satisfies Record<string, RGB>

// Constants for Manifold processing
export const MANIFOLD_Z_OFFSET = 0.001 // Small offset to prevent Z-fighting
export const SMOOTH_CIRCLE_SEGMENTS = 32 // Number of segments for smooth circles
export const TRACE_TEXTURE_RESOLUTION = 150 // pixels per mm for trace texture

export const FAUX_BOARD_OPACITY = 0.6 // Opacity for faux boards (60% transparent)
export const boardMaterialColors: Record<PcbBoard["material"], RGB> = {
  fr1: colors.fr1Tan,
  fr4: colors.fr4Tan,
}

// Color for the soldermask layer itself (dark green coating)
export const soldermaskColors: Record<PcbBoard["material"], RGB> = {
  fr1: colors.fr1SolderMaskGreen,
  fr4: colors.fr4SolderMaskGreen,
}
