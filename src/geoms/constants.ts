import type { RGB } from "@jscad/modeling/src/colors"
import type { PcbBoard } from "circuit-json"

export const M = 0.01

export const colors = {
  copper: [0.9, 0.6, 0.2],
  fr4Green: [0x05 / 255, 0xa3 / 255, 0x2e / 255],
  fr4GreenSolderWithMask: [0x00 / 255, 0x98 / 255, 0x13 / 255],
  fr1Copper: [0.8, 0.4, 0.2],
  fr1CopperSolderWithMask: [0.9, 0.6, 0.2],
} satisfies Record<string, RGB>
export const boardMaterialColors: Record<PcbBoard["material"], RGB> = {
  fr1: colors.fr1Copper,
  fr4: colors.fr4Green,
}

export const tracesMaterialColors: Record<PcbBoard["material"], RGB> = {
  fr1: colors.fr1CopperSolderWithMask,
  fr4: colors.fr4GreenSolderWithMask,
}
