import {
  Circuit,
  getAssemblyExplosion,
  type RootCircuit,
} from "@tscircuit/core"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import type { AnyCircuitElement } from "circuit-json"

const EMPTY: AnyCircuitElement[] = []

/** Keep the rendered tree: Circuit JSON alone does not contain authored stages. */
export function useAssemblyExplosion(
  children?: ReactNode,
  circuit?: RootCircuit,
) {
  const [rendered, setRendered] = useState<{
    children: ReactNode
    circuit?: RootCircuit
    error?: Error
  }>()
  useEffect(() => {
    if (!children || circuit) return
    let cancelled = false
    const next = new Circuit()
    const render = async () => {
      try {
        next.add(children as Parameters<RootCircuit["add"]>[0])
        await next.renderUntilSettled()
        if (!cancelled) setRendered({ children, circuit: next })
      } catch (error) {
        if (!cancelled)
          setRendered({
            children,
            error: error instanceof Error ? error : new Error(String(error)),
          })
      }
    }
    void render()
    return () => {
      cancelled = true
    }
  }, [children, circuit])
  const current =
    circuit ?? (rendered?.children === children ? rendered?.circuit : undefined)
  const assembled = useMemo(() => current?.getCircuitJson() ?? EMPTY, [current])
  const authored = useMemo(() => {
    if (!current?.firstChild) return { stages: [] as string[] }
    try {
      return { stages: getAssemblyExplosion(current).stages }
    } catch (error) {
      return {
        stages: [] as string[],
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }, [current])
  // Store the source with the position so replacing a circuit resets immediately.
  const [selection, setSelection] = useState({ circuit: current, amount: 0 })
  const amount = selection.circuit === current ? selection.amount : 0
  const view = useMemo(() => {
    if (!current || !authored.stages.length || amount === 0) return undefined
    const stageIndex = Math.min(
      Math.ceil(amount) - 1,
      authored.stages.length - 1,
    )
    return getAssemblyExplosion(current, {
      throughStageRef: authored.stages[stageIndex],
      stageProgress: amount - stageIndex,
    })
  }, [current, authored, amount])
  return {
    assembled,
    view,
    stages: authored.stages,
    amount,
    setAmount: (value: number) =>
      setSelection({
        circuit: current,
        amount: Number.isFinite(value)
          ? Math.max(0, Math.min(authored.stages.length, value))
          : 0,
      }),
    error:
      authored.error ??
      (rendered?.children === children ? rendered?.error : undefined),
  }
}
