import type { PcbBoard } from "circuit-json"
import { solderMaskColorPresets } from "../geoms/constants"

/**
 * Resolve `pcb_board.solder_mask_color` to a solder mask coating preset.
 *
 * Returns `undefined` when no usable color is set (missing, empty, or
 * `not_specified`) so callers keep their existing material-derived default
 * instead of forcing a color the user never requested.
 */
export const resolveSolderMaskPreset = (
  solderMaskColor?: PcbBoard["solder_mask_color"],
) => {
  if (!solderMaskColor) return undefined
  const normalized = solderMaskColor.trim().toLowerCase()
  if (normalized === "" || normalized === "not_specified") return undefined
  return solderMaskColorPresets[
    normalized as keyof typeof solderMaskColorPresets
  ]
}

/** Convenience accessor for the coating color over bare substrate. */
export const resolveSolderMaskColor = (
  solderMaskColor?: PcbBoard["solder_mask_color"],
) => resolveSolderMaskPreset(solderMaskColor)?.soldermask
