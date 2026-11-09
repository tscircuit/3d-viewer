import type { RootCircuit } from "@tscircuit/core"
import type { AssemblyExplosionRotation } from "./rotation-playback"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import type { AnyCircuitElement } from "circuit-json"

import type { createExplosionEvaluator } from "./create-explosion-evaluator"

const EMPTY: AnyCircuitElement[] = []

let cachedCreateEvaluator: typeof createExplosionEvaluator | undefined

function getInitialCreateEvaluator(
  hasProgram: boolean,
): typeof createExplosionEvaluator | undefined {
  if (!hasProgram) return undefined
  if (cachedCreateEvaluator) return cachedCreateEvaluator
  if (typeof Bun !== "undefined") {
    try {
      cachedCreateEvaluator = (
        require("./create-explosion-evaluator") as {
          createExplosionEvaluator: typeof createExplosionEvaluator
        }
      ).createExplosionEvaluator
      return cachedCreateEvaluator
    } catch {
      return undefined
    }
  }
  return undefined
}

export interface ExplosionStageDiagnostic {
  kind: "annotated_unverified_contact" | "collision_error" | "incomplete_check"
  message: string
  rationale?: string
  operation?: string
  sweptIntersectionVolumeMm3?: number
}

export interface ExplosionStageMetadata {
  displayName?: string
  instructions?: string
  diagnostics?: ExplosionStageDiagnostic[]
}

const nonBlankString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function extractExplosionStageMetadata(
  assembled: AnyCircuitElement[],
  circuit?: RootCircuit,
): Record<string, ExplosionStageMetadata> {
  const metadata: Record<string, ExplosionStageMetadata> = {}
  const stageIdToName = new Map<string, string>()

  const ensureStage = (name: string): ExplosionStageMetadata => {
    if (!metadata[name]) metadata[name] = {}
    return metadata[name]!
  }

  for (const element of assembled) {
    if (element.type !== "cad_explosion_stage") continue
    const record = element as unknown as Record<string, unknown>
    const stageName = nonBlankString(record.name)
    const stageId = nonBlankString(record.cad_explosion_stage_id)
    if (!stageName) continue
    if (stageId) stageIdToName.set(stageId, stageName)
    const target = ensureStage(stageName)
    const displayName =
      nonBlankString(record.display_name) ?? nonBlankString(record.displayName)
    const instructions = nonBlankString(record.instructions)
    if (displayName) target.displayName = displayName
    if (instructions) target.instructions = instructions
  }

  if (circuit) {
    const components = (circuit as unknown as { children?: unknown[] }).children
    const visit = (nodes: unknown[] | undefined) => {
      if (!Array.isArray(nodes)) return
      for (const rawNode of nodes) {
        const node = rawNode as {
          componentName?: string
          props?: Record<string, unknown>
          _parsedProps?: Record<string, unknown>
          children?: unknown[]
        }
        if (node?.componentName === "AssemblyExplosionStage") {
          const props = node.props ?? node._parsedProps ?? {}
          const rawName = nonBlankString(props.name)
          const displayName =
            nonBlankString(props.displayName) ??
            nonBlankString(props.display_name)
          const instructions = nonBlankString(props.instructions)
          if (rawName && (displayName || instructions)) {
            const matchedStageNames = [...stageIdToName.values()].filter(
              (stageName) =>
                stageName === rawName || stageName.endsWith(`.${rawName}`),
            )
            const targets = matchedStageNames.length
              ? matchedStageNames
              : [rawName]
            for (const stageName of targets) {
              const target = ensureStage(stageName)
              if (displayName && !target.displayName)
                target.displayName = displayName
              if (instructions && !target.instructions)
                target.instructions = instructions
            }
          }
        }
        visit(node?.children)
      }
    }
    visit(components)
  }

  const resolveStageName = (
    record: Record<string, unknown>,
  ): string | undefined => {
    const stageId = nonBlankString(record.cad_explosion_stage_id)
    if (stageId && stageIdToName.has(stageId)) return stageIdToName.get(stageId)
    const directStage =
      nonBlankString(record.stage_name) ??
      nonBlankString(record.stageRef) ??
      nonBlankString(record.stage_ref)
    if (directStage) return directStage
    const message = nonBlankString(record.message)
    const match = message?.match(/Explosion stage "([^"]+)"/)
    return match?.[1]
  }

  for (const element of assembled) {
    const record = element as unknown as Record<string, unknown>
    if (record.type === "cad_explosion_collision_error") {
      const stageName = resolveStageName(record)
      if (!stageName) continue
      const isAnnotated =
        record.verification_status === "annotated_unverified_contact" ||
        record.is_annotated_contact === true ||
        Boolean(
          nonBlankString(record.contact_annotation_id) ||
            nonBlankString(record.rationale) ||
            nonBlankString(record.operation),
        )
      const target = ensureStage(stageName)
      target.diagnostics ??= []
      target.diagnostics.push({
        kind: isAnnotated ? "annotated_unverified_contact" : "collision_error",
        message:
          nonBlankString(record.message) ??
          `Unverified contact in stage "${stageName}"`,
        rationale: nonBlankString(record.rationale),
        operation: nonBlankString(record.operation),
        sweptIntersectionVolumeMm3:
          typeof record.swept_intersection_volume_mm3 === "number"
            ? record.swept_intersection_volume_mm3
            : undefined,
      })
    } else if (record.type === "cad_explosion_contact_annotation") {
      const stageName = resolveStageName(record)
      if (!stageName) continue
      const target = ensureStage(stageName)
      target.diagnostics ??= []
      target.diagnostics.push({
        kind: "annotated_unverified_contact",
        message:
          nonBlankString(record.message) ??
          nonBlankString(record.rationale) ??
          `Annotated unverified contact in stage "${stageName}"`,
        rationale: nonBlankString(record.rationale),
        operation: nonBlankString(record.operation),
      })
    } else if (record.type === "cad_explosion_collision_check_warning") {
      const stageName = resolveStageName(record)
      const warningMessage =
        nonBlankString(record.message) ??
        "Explosion collision verification is incomplete"
      const stageNames = stageName ? [stageName] : [...stageIdToName.values()]
      for (const name of stageNames) {
        const target = ensureStage(name)
        target.diagnostics ??= []
        target.diagnostics.push({
          kind: "incomplete_check",
          message: warningMessage,
        })
      }
    }
  }

  return metadata
}

/** Render TSX once, then use the same serialized program as JSON-only inputs. */
export function useAssemblyExplosion(
  children?: ReactNode,
  circuit?: RootCircuit,
  circuitJson?: AnyCircuitElement[],
  rotations?: readonly AssemblyExplosionRotation[],
) {
  const [showGuidelines, setShowGuidelines] = useState(true)
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
  const hasProgram =
    Boolean(rotations?.length) ||
    assembled.some(
      (element) =>
        element.type === "cad_explosion_stage" ||
        element.type === "cad_explosion_move",
    )
  const [createEvaluator, setCreateEvaluator] = useState<
    typeof createExplosionEvaluator | undefined
  >(() => getInitialCreateEvaluator(hasProgram))
  const [evaluatorError, setEvaluatorError] = useState<Error>()
  const resolvedCreateEvaluator =
    createEvaluator ?? getInitialCreateEvaluator(hasProgram)
  useEffect(() => {
    if (!hasProgram || resolvedCreateEvaluator) return
    let cancelled = false
    setEvaluatorError(undefined)
    import("./create-explosion-evaluator")
      .then((module) => {
        cachedCreateEvaluator = module.createExplosionEvaluator
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
  }, [hasProgram, resolvedCreateEvaluator])
  const authored = useMemo(() => {
    if (!hasProgram || !resolvedCreateEvaluator) {
      return {
        stages: [] as string[],
        error: hasProgram ? evaluatorError : undefined,
      }
    }
    try {
      const evaluate = resolvedCreateEvaluator(assembled, rotations)
      return { stages: evaluate().stages, evaluate }
    } catch (error) {
      return {
        stages: [] as string[],
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }, [
    assembled,
    rotations,
    hasProgram,
    resolvedCreateEvaluator,
    evaluatorError,
  ])
  const stageMetadata = useMemo(
    () => extractExplosionStageMetadata(assembled, current),
    [assembled, current],
  )
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
    showGuidelines,
    setShowGuidelines,
    assembled,
    view,
    stages: authored.stages,
    stageMetadata,
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
