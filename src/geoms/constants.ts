import type { RGB } from "@jscad/modeling/src/colors"
import type { PcbBoard } from "circuit-json"

export const M = 0.01

export const BOARD_SURFACE_OFFSET = {
  traces: 0.001,
  copper: 0.002,
} as const

export const colors = {
  copper: [0.9, 0.6, 0.2],
  fr4Tan: [0.6, 0.43, 0.28],
  fr4SolderMaskGreen: [0.02, 0.1, 0.04],
  fr4TracesWithMaskGreen: [0.0, 0.5, 0.25],
  fr4TracesWithoutMaskTan: [0.6, 0.43, 0.28],
  fr1Tan: [0.8, 0.4, 0.2],
  fr1TracesWithMaskCopper: [0.9, 0.6, 0.2],
  fr1SolderMaskGreen: [0.02, 0.1, 0.04],
} satisfies Record<string, RGB>

// Constants for Manifold processing
export const MANIFOLD_Z_OFFSET = 0.001 // Small offset to prevent Z-fighting
export const SMOOTH_CIRCLE_SEGMENTS = 32 // Number of segments for smooth circles
export const DEFAULT_SMT_PAD_THICKNESS = 0.035 // Typical 1oz copper thickness in mm
export const TRACE_TEXTURE_RESOLUTION = 50 // pixels per mm for trace texture
export const boardMaterialColors: Record<PcbBoard["material"], RGB> = {
  fr1: colors.fr1Tan,
  fr4: colors.fr4Tan,
}

// Color for traces (tan/copper when no soldermask)
export const tracesMaterialColors: Record<PcbBoard["material"], RGB> = {
  fr1: colors.fr1TracesWithMaskCopper,
  fr4: colors.fr4TracesWithoutMaskTan,
}

// Color for the soldermask layer itself (dark green coating)
export const soldermaskColors: Record<PcbBoard["material"], RGB> = {
  fr1: colors.fr1SolderMaskGreen,
  fr4: colors.fr4SolderMaskGreen,
}
