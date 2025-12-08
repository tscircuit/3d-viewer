import { useMemo } from "react"
import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement } from "circuit-json"

const DEFAULT_PCB_THICKNESS = 1.2

export function usePcbThickness(
  circuitJson: AnyCircuitElement[] | null,
): number {
  return useMemo(() => {
    if (!circuitJson) return DEFAULT_PCB_THICKNESS
    try {
      const board = su(circuitJson as any).pcb_board.list()[0]
      return board?.thickness ?? DEFAULT_PCB_THICKNESS
    } catch (e) {
      return DEFAULT_PCB_THICKNESS
    }
  }, [circuitJson])
}
