import type { PcbBoard } from "circuit-json"
import * as THREE from "three"
import { boardMaterialColors, colors } from "../geoms/constants"
import { resolveSoldermaskColor } from "./soldermask-color"

const LEGACY_FR4_EDGE_COLOR = new THREE.Color(0x103a26)

export const getBoardEdgeColor = ({
  material,
  solder_mask_color,
  coverlay_color,
}: Pick<
  PcbBoard,
  "material" | "solder_mask_color" | "coverlay_color"
>): THREE.Color => {
  if (material === "flex" && coverlay_color !== undefined) {
    return new THREE.Color("#cc9c33")
  }
  const soldermaskColor = resolveSoldermaskColor(solder_mask_color)
  if (soldermaskColor) return soldermaskColor
  if (material === "fr4") return LEGACY_FR4_EDGE_COLOR.clone()

  const materialColor = boardMaterialColors[material] ?? colors.fr4Tan
  return new THREE.Color(materialColor[0], materialColor[1], materialColor[2])
}
