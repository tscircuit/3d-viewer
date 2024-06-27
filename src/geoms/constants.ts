import type { RGB } from "@jscad/modeling/src/colors"

export const M = 0.01

export const colors = {
  copper: [0.9, 0.6, 0.2],
  fr4Green: [0x05 / 255, 0xa3 / 255, 0x2e / 255],
} satisfies Record<string, RGB>
