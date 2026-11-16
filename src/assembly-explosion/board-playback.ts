import { createBoardOwnerMap } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, CadComponent, PcbBoard } from "circuit-json"
import { Matrix4, Vector3 } from "three"
import type { RigidExplosionView } from "./rotation-playback"

/** Viewer-side motion in circuit-world millimeters, with +Z above the board. */
export interface AssemblyExplosionBoardMove {
  stageName: string
  pcbBoardId: PcbBoard["pcb_board_id"]
  translation: readonly [number, number, number]
}

export function createBoardPlayback(
  assembled: AnyCircuitElement[],
  boardMoves: readonly AssemblyExplosionBoardMove[],
) {
  const stages = assembled
    .filter((element) => element.type === "cad_explosion_stage")
    .sort((a, b) => a.order - b.order)
  const stageNames = new Set(stages.map((stage) => stage.name))
  const boards = assembled.filter((element) => element.type === "pcb_board")
  const [board] = boards
  if (
    boardMoves.length > 0 &&
    (boards.length !== 1 ||
      board?.pcb_panel_id ||
      assembled.some((element) => element.type === "pcb_panel"))
  )
    throw new Error("Explosion PCB moves require one unpanelized board")

  const movesByStage = new Map<string, AssemblyExplosionBoardMove>()

  for (const move of boardMoves) {
    if (!stageNames.has(move.stageName))
      throw new Error(`Unknown stage for PCB move "${move.stageName}"`)
    if (move.pcbBoardId !== board?.pcb_board_id)
      throw new Error(`Unknown PCB board "${move.pcbBoardId}" in explosion`)
    if (movesByStage.has(move.stageName))
      throw new Error(
        `Duplicate PCB move for explosion stage "${move.stageName}"`,
      )
    if (
      move.translation.length !== 3 ||
      ![...move.translation].every(Number.isFinite)
    )
      throw new Error("Explosion PCB move requires a finite XYZ translation")
    movesByStage.set(move.stageName, move)
  }

  const boardCadIds: CadComponent["cad_component_id"][] = []
  if (board && movesByStage.size > 0) {
    const owners = createBoardOwnerMap(assembled)
    for (const element of assembled) {
      if (
        element.type === "cad_component" &&
        element.pcb_component_id &&
        owners.get(element.pcb_component_id)?.pcb_board_id ===
          board.pcb_board_id
      )
        boardCadIds.push(element.cad_component_id)
    }
  }

  return (
    view: RigidExplosionView,
    options?: { throughStageRef?: string; stageProgress?: number },
  ): RigidExplosionView => {
    let stop = stages.length - 1
    if (options?.throughStageRef !== undefined) {
      stop = stages.findIndex((stage) => stage.name === options.throughStageRef)
      if (stop < 0) throw new Error("Unknown explosion playback stage")
    }
    const progress = options?.stageProgress ?? 1
    if (!Number.isFinite(progress) || progress < 0 || progress > 1)
      throw new Error("Explosion progress must be between zero and one")

    const pcbBoardTransforms: NonNullable<
      RigidExplosionView["pcbBoardTransforms"]
    > = new Map()
    const pcbBoardLines: NonNullable<RigidExplosionView["pcbBoardLines"]> = []
    if (!board) return { ...view, pcbBoardTransforms, pcbBoardLines }

    const offset = new Vector3()
    const { x, y } = board.center
    for (const [index, stage] of stages.entries()) {
      if (index > stop) break
      const move = movesByStage.get(stage.name)
      let fraction = 1
      if (index === stop) fraction = progress
      if (!move || !fraction) continue
      const step = new Vector3(...move.translation).multiplyScalar(fraction)
      if (!step.lengthSq()) continue

      const start = { x: x + offset.x, y: y + offset.y, z: offset.z }
      offset.add(step)
      const end = { x: x + offset.x, y: y + offset.y, z: offset.z }
      pcbBoardLines.push({
        points: [start, end],
      })
    }

    if (pcbBoardLines.length > 0) {
      const transform = new Matrix4().makeTranslation(
        offset.x,
        offset.y,
        offset.z,
      )
      pcbBoardTransforms.set(board.pcb_board_id, transform)
      for (const id of boardCadIds) pcbBoardTransforms.set(id, transform)
    }
    return { ...view, pcbBoardTransforms, pcbBoardLines }
  }
}
