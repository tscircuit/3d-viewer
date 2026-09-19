import type { AnyCircuitElement } from "circuit-json"
import { useMemo } from "react"
import {
  DEFAULT_BOARD_THICKNESS,
  getPcbThicknessFromCircuitJson,
} from "../utils/get-pcb-thickness"

export function usePcbThickness(
  circuitJson: AnyCircuitElement[] | null,
): number {
  return useMemo(() => {
    if (!circuitJson) return DEFAULT_BOARD_THICKNESS
    try {
      return getPcbThicknessFromCircuitJson(circuitJson)
    } catch {
      return DEFAULT_BOARD_THICKNESS
    }
  }, [circuitJson])
}
