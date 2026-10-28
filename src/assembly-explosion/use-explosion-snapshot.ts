import type { AssemblyExplosionView } from "@tscircuit/core"
import type { AnyCircuitElement, CadComponent } from "circuit-json"
import { useMemo, useState } from "react"

/** The target is a second exported pose, not a new Circuit JSON record type.
 * Only CAD translations are supported; reject changes we cannot display. */
export function validateExplosionSnapshot(
  assembled: AnyCircuitElement[],
  target: AnyCircuitElement[],
) {
  const cad = assembled.filter(
    (e): e is CadComponent => e.type === "cad_component",
  )
  const targets = target.filter(
    (e): e is CadComponent => e.type === "cad_component",
  )
  const byId = new Map(targets.map((e) => [e.cad_component_id, e]))
  if (byId.size !== targets.length || targets.length !== cad.length)
    throw new Error("Explosion poses must contain the same CAD component IDs")
  const unchanged = (records: AnyCircuitElement[]) =>
    JSON.stringify(
      records.filter(
        (e) => e.type !== "cad_component" && e.type !== "cad_reference_surface",
      ),
    )
  if (unchanged(assembled) !== unchanged(target))
    throw new Error(
      "Explosion poses must preserve PCB geometry and source records",
    )
  return cad
    .map((base) => {
      const end = byId.get(base.cad_component_id)
      if (!end)
        throw new Error(`Missing explosion target for ${base.cad_component_id}`)
      for (const p of [base.position, end.position]) {
        if (!p || ![p.x, p.y, p.z].every(Number.isFinite))
          throw new Error("Explosion positions must be finite XYZ coordinates")
      }
      const { position: _, ...original } = base
      const { position: __, ...destination } = end
      if (JSON.stringify(original) !== JSON.stringify(destination))
        throw new Error(
          "Explosion poses support translations only; models and rotations must match",
        )
      return { base, end }
    })
    .filter(
      ({ base, end }) =>
        base.position.x !== end.position.x ||
        base.position.y !== end.position.y ||
        base.position.z !== end.position.z,
    )
}

export function useExplosionSnapshot(
  assembled: AnyCircuitElement[],
  target?: AnyCircuitElement[],
) {
  const [selection, setSelection] = useState({ assembled, target, amount: 0 })
  const amount =
    selection.assembled === assembled && selection.target === target
      ? selection.amount
      : 0
  const validated = useMemo(() => {
    try {
      return {
        moves: target ? validateExplosionSnapshot(assembled, target) : [],
      }
    } catch (error) {
      return {
        moves: [],
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }, [assembled, target])
  const view = useMemo<AssemblyExplosionView | undefined>(() => {
    if (!amount || !validated.moves.length) return undefined
    const moved = new Map(
      validated.moves.map(({ base, end }) => [
        base.cad_component_id,
        {
          ...base,
          position: {
            x: base.position.x + (end.position.x - base.position.x) * amount,
            y: base.position.y + (end.position.y - base.position.y) * amount,
            z: base.position.z + (end.position.z - base.position.z) * amount,
          },
        },
      ]),
    )
    return {
      circuitJson: assembled.map((e) =>
        e.type === "cad_component" ? (moved.get(e.cad_component_id) ?? e) : e,
      ),
      stages: ["Exploded"],
      lines: validated.moves.map(({ base }) => ({
        stageRef: "Exploded",
        targetRef: base.cad_component_id,
        points: [base.position, moved.get(base.cad_component_id)!.position],
      })),
      collisionCheckStatus: "not_implemented",
    }
  }, [assembled, validated, amount])
  return {
    assembled,
    view,
    amount,
    stages: validated.moves.length ? ["Exploded"] : [],
    error: validated.error,
    setAmount: (value: number) =>
      setSelection({
        assembled,
        target,
        amount: Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0,
      }),
  }
}
