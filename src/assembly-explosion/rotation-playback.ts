import type { AssemblyExplosionView } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"
import { Euler, Matrix4, Quaternion, Vector3, MathUtils } from "three"

/** Viewer-side rotation of an authored explosion move, in circuit-world space.
 * Translation is applied first; pivot is a fixed point in the current scene.
 * Core's circuit-json explosion schema currently describes translations only.
 */
export interface AssemblyExplosionRotation {
  stageName: string
  moveIndex?: number
  axis: "x" | "y" | "z"
  angleDegrees: number
  pivot: [number, number, number]
}
export type RigidExplosionView = AssemblyExplosionView & {
  assemblyTransforms?: Map<string, Matrix4>
  motionGuides?: Array<{ targetId: string; matrices: Matrix4[] }>
}

export function createRotationPlayback(
  assembled: AnyCircuitElement[],
  rotations: readonly AssemblyExplosionRotation[],
) {
  const stages = assembled
    .filter((e) => e.type === "cad_explosion_stage")
    .sort((a, b) => a.order - b.order)
  const moves = assembled.filter((e) => e.type === "cad_explosion_move")
  const components = new Map(
    assembled
      .filter((e) => e.type === "cad_component")
      .map((e) => [e.cad_component_id, e]),
  )
  const stageById = new Map(stages.map((s) => [s.cad_explosion_stage_id, s]))
  const targets = (move: (typeof moves)[number]) => [
    ...new Set(
      move.targets.flatMap((t) =>
        t.type === "cad_component"
          ? [t.cad_component_id]
          : t.type === "cad_explosion_stage"
            ? stageById.get(t.cad_explosion_stage_id)!.cad_component_ids
            : [],
      ),
    ),
  ]
  const rotationByMove = new Map<string, AssemblyExplosionRotation>()
  for (const rotation of rotations) {
    const stage = stages.find((s) => s.name === rotation.stageName)
    const move = moves.find(
      (m) =>
        m.cad_explosion_stage_id === stage?.cad_explosion_stage_id &&
        m.order === (rotation.moveIndex ?? 0),
    )
    if (!move)
      throw new Error(`Unknown rotation move in stage "${rotation.stageName}"`)
    if (rotationByMove.has(move.cad_explosion_move_id))
      throw new Error("Duplicate rotation for explosion move")
    if (
      !Number.isFinite(rotation.angleDegrees) ||
      !["x", "y", "z"].includes(rotation.axis) ||
      rotation.pivot.length !== 3 ||
      !rotation.pivot.every(Number.isFinite)
    )
      throw new Error(
        "Explosion rotation requires a finite angle, axis, and pivot",
      )
    if (
      move.targets.some(
        (t) =>
          t.type === "cad_reference_surface" ||
          (t.type === "cad_explosion_stage" &&
            stageById.get(t.cad_explosion_stage_id)?.cad_reference_surface_ids
              ?.length),
      )
    )
      throw new Error("Rotation of reference surfaces is not supported")
    for (const id of targets(move))
      if (components.get(id)?.pcb_component_id)
        throw new Error("Rotation of PCB-mounted components is not supported")
    rotationByMove.set(move.cad_explosion_move_id, rotation)
  }
  const plan = stages.map((stage) =>
    moves
      .filter((m) => m.cad_explosion_stage_id === stage.cad_explosion_stage_id)
      .sort((a, b) => a.order - b.order),
  )
  return (
    view: AssemblyExplosionView,
    options?: { throughStageRef?: string; stageProgress?: number },
  ): RigidExplosionView => {
    const stop =
      options?.throughStageRef === undefined
        ? stages.length - 1
        : stages.findIndex((s) => s.name === options.throughStageRef)
    const transforms = new Map<string, Matrix4>()
    const guides: NonNullable<RigidExplosionView["motionGuides"]> = []
    for (let i = 0; i <= stop; i++) {
      const stageMoves = plan[i]!
      for (const [index, move] of stageMoves.entries()) {
        const fraction =
          i === stop
            ? Math.max(
                0,
                Math.min(
                  1,
                  (options?.stageProgress ?? 1) * stageMoves.length - index,
                ),
              )
            : 1
        if (!fraction) continue
        const rotation = rotationByMove.get(move.cad_explosion_move_id)
        const stepAt = (t: number) => {
          const step = new Matrix4().makeTranslation(
            move.translation.x * t,
            move.translation.y * t,
            move.translation.z * t,
          )
          if (rotation) {
            const pivot = new Vector3(...rotation.pivot)
            const axis = new Vector3(
              rotation.axis === "x" ? 1 : 0,
              rotation.axis === "y" ? 1 : 0,
              rotation.axis === "z" ? 1 : 0,
            )
            step
              .premultiply(
                new Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z),
              )
              .premultiply(
                new Matrix4().makeRotationAxis(
                  axis,
                  MathUtils.degToRad(rotation.angleDegrees) * t,
                ),
              )
              .premultiply(
                new Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z),
              )
          }
          return step
        }
        for (const id of targets(move)) {
          const before = transforms.get(id) ?? new Matrix4()
          const after = stepAt(fraction).multiply(before)
          transforms.set(id, after)
          if (
            rotation?.angleDegrees ||
            Object.values(move.translation).some((v) => v !== 0)
          ) {
            const segments = rotation
              ? Math.max(
                  1,
                  Math.min(
                    72,
                    Math.ceil(Math.abs(rotation.angleDegrees * fraction) / 10),
                  ),
                )
              : 1
            guides.push({
              targetId: id,
              matrices: Array.from({ length: segments + 1 }, (_, j) =>
                stepAt((fraction * j) / segments).multiply(before),
              ),
            })
          }
        }
      }
    }
    return {
      ...view,
      assemblyTransforms: transforms,
      motionGuides: guides,
      circuitJson: view.circuitJson.map((e) => {
        if (e.type !== "cad_component" || !transforms.has(e.cad_component_id))
          return e
        const original = components.get(e.cad_component_id)!
        const matrix = transforms.get(e.cad_component_id)!
        const position = new Vector3(
          original.position.x,
          original.position.y,
          original.position.z,
        ).applyMatrix4(matrix)
        const rotation = original.rotation ?? { x: 0, y: 0, z: 0 }
        const originalEuler = new Euler(
          MathUtils.degToRad(rotation.x),
          MathUtils.degToRad(rotation.y),
          MathUtils.degToRad(rotation.z),
        )
        const quaternion = new Quaternion()
          .setFromRotationMatrix(matrix)
          .multiply(new Quaternion().setFromEuler(originalEuler))
        const euler = new Euler().setFromQuaternion(quaternion)
        return {
          ...e,
          position: { x: position.x, y: position.y, z: position.z },
          rotation: {
            x: MathUtils.radToDeg(euler.x),
            y: MathUtils.radToDeg(euler.y),
            z: MathUtils.radToDeg(euler.z),
          },
        }
      }),
    }
  }
}
