import { Circuit } from "@tscircuit/core"
import { useMemo } from "react"
import type { AnyCircuitElement } from "circuit-json"

export const useConvertChildrenToSoup = (
  children?: any,
): AnyCircuitElement[] | undefined => {
  return useMemo(() => {
    if (!children) return undefined
    const circuit = new Circuit()
    circuit.add(children)
    circuit.render()
    return circuit.getCircuitJson() as any
  }, [children])
}
