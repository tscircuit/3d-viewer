import type { RootCircuit } from "@tscircuit/core"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import type { AnyCircuitElement } from "circuit-json"

import type { createExplosionEvaluator } from "./create-explosion-evaluator"

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
    const render = async () => {
      try {
        const { Circuit } = await import("@tscircuit/core")
        if (cancelled) return
        const next = new Circuit()
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
  const hasProgram = assembled.some(
    (element) =>
      element.type === "cad_explosion_stage" ||
      element.type === "cad_explosion_move",
  )
  const [createEvaluator, setCreateEvaluator] =
    useState<typeof createExplosionEvaluator>()
  const [evaluatorError, setEvaluatorError] = useState<Error>()
  useEffect(() => {
    if (!hasProgram) return
    let cancelled = false
    setEvaluatorError(undefined)
    import("./create-explosion-evaluator")
      .then((module) => {
        if (!cancelled)
          setCreateEvaluator(() => module.createExplosionEvaluator)
      })
      .catch((error) => {
        if (!cancelled)
          setEvaluatorError(
            error instanceof Error ? error : new Error(String(error)),
          )
      })
    return () => {
      cancelled = true
    }
  }, [hasProgram])
  const authored = useMemo(() => {
    if (!hasProgram || !createEvaluator) {
      return {
        stages: [] as string[],
        error: hasProgram ? evaluatorError : undefined,
      }
    }
    try {
      const evaluate = createEvaluator(assembled)
      return { stages: evaluate().stages, evaluate }
    } catch (error) {
      return {
        stages: [] as string[],
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }, [assembled, hasProgram, createEvaluator, evaluatorError])
  // Store the source with the position so replacing a circuit resets immediately.
  const [selection, setSelection] = useState({ source: assembled, amount: 0 })
  const amount = selection.source === assembled ? selection.amount : 0
  const view = useMemo(() => {
    if (!authored.evaluate || !authored.stages.length || amount === 0)
      return undefined
    const stageIndex = Math.min(
      Math.ceil(amount) - 1,
      authored.stages.length - 1,
    )
    return authored.evaluate({
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
