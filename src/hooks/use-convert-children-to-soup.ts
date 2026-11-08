import { useEffect, useState } from "react"
import type { AnyCircuitElement } from "circuit-json"

const EMPTY: AnyCircuitElement[] = []

export const useConvertChildrenToCircuitJson = (
  children?: any,
): AnyCircuitElement[] => {
  const [result, setResult] = useState<{
    children: any
    circuitJson?: AnyCircuitElement[]
    error?: unknown
  }>()
  useEffect(() => {
    if (!children) return
    let cancelled = false
    import("@tscircuit/core")
      .then(({ Circuit }) => {
        if (cancelled) return
        const circuit = new Circuit()
        circuit.add(children)
        circuit.render()
        setResult({ children, circuitJson: circuit.getCircuitJson() })
      })
      .catch((error) => {
        if (!cancelled) setResult({ children, error })
      })
    return () => {
      cancelled = true
    }
  }, [children])
  if (result?.children !== children) return EMPTY
  if (result?.error) throw result.error
  return result?.circuitJson ?? EMPTY
}
