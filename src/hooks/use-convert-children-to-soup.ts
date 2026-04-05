import { Circuit } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"
import { useMemo } from "react"

export const useConvertChildrenToCircuitJson = (
  children?: any,
): AnyCircuitElement[] => {
  return useMemo(() => {
    if (!children) return []
    const circuit = new Circuit()
    circuit.add(children)
    circuit.render()
    return circuit.getCircuitJson() as any
  }, [children])
}
