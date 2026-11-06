import {
  Circuit,
  getCircuitJsonAssemblyExplosion,
  type RootCircuit,
} from "@tscircuit/core"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import type { AnyCircuitElement } from "circuit-json"

const EMPTY: AnyCircuitElement[] = []

/** Render TSX once, then use the same serialized program as JSON-only inputs. */
export function useAssemblyExplosion(
  children?: ReactNode,
  circuit?: RootCircuit,
  circuitJson?: AnyCircuitElement[],
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
  const source = useMemo(() => {
    try {
      return { assembled: circuitJson ?? current?.getCircuitJson() ?? EMPTY }
    } catch (error) {
      return {
        assembled: current?.db.toArray() ?? EMPTY,
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }, [current, circuitJson])
  const assembled = source.assembled
  const authored = useMemo(() => {
    try {
      return { stages: getCircuitJsonAssemblyExplosion(assembled).stages }
    } catch (error) {
      return {
        stages: [] as string[],
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }, [assembled])
  // Store the source with the position so replacing a circuit resets immediately.
  const [selection, setSelection] = useState({ source: assembled, amount: 0 })
  const amount = selection.source === assembled ? selection.amount : 0
  const view = useMemo(() => {
    if (!authored.stages.length || amount === 0) return undefined
    const stageIndex = Math.min(
      Math.ceil(amount) - 1,
      authored.stages.length - 1,
    )
    return getCircuitJsonAssemblyExplosion(assembled, {
      throughStageRef: authored.stages[stageIndex],
      stageProgress: amount - stageIndex,
    })
  }, [assembled, authored, amount])
  return {
    assembled,
    view,
    stages: authored.stages,
    amount,
    setAmount: (value: number) =>
      setSelection({
        source: assembled,
        amount: Number.isFinite(value)
          ? Math.max(0, Math.min(authored.stages.length, value))
          : 0,
      }),
    error:
      source.error ??
      authored.error ??
      (rendered?.children === children ? rendered?.error : undefined),
  }
}
