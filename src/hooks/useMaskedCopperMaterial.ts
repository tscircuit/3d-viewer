import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import { useEffect, useMemo } from "react"
import { useLayerVisibility } from "../contexts/LayerVisibilityContext"
import { createMaskedCopperMaterial } from "../utils/create-masked-copper-material"

export function useMaskedCopperMaterial(
  circuitJson: AnyCircuitElement[],
  boardData: PcbBoard | null,
) {
  const { visibility } = useLayerVisibility()
  const { topMask, bottomMask } = visibility
  const coating = useMemo(
    () =>
      boardData &&
      circuitJson.some(
        (e) =>
          e.type === "pcb_via" ||
          e.type === "pcb_plated_hole" ||
          (e.type === "pcb_trace" &&
            e.route.some((point) => point.route_type === "via")),
      )
        ? createMaskedCopperMaterial({
            circuitJson,
            boardData,
            visibility: { topMask, bottomMask },
          })
        : null,
    [circuitJson, boardData, topMask, bottomMask],
  )
  useEffect(() => () => coating?.dispose(), [coating])
  return coating?.material
}
