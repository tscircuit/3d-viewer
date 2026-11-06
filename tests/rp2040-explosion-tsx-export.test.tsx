import { expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { Circuit } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"
import { Rp2040MotorAssembly } from "../stories/fixtures/rp2040-motor-assembly/assembly"
import assembled from "../stories/fixtures/rp2040-motor-assembly/assembled.circuit.json"
import generation from "../stories/fixtures/rp2040-motor-assembly/generation.json"

// CAD IDs differ between the pinned full-board build and this assembly-only
// render. Compare the program by the actual source names those IDs identify.
function namedProgram(json: AnyCircuitElement[]) {
  const sources = new Map(
    json
      .filter((e) => e.type === "source_component")
      .map((e) => [e.source_component_id, e.name]),
  )
  const cadNames = new Map(
    json
      .filter((e) => e.type === "cad_component")
      .map((e) => [e.cad_component_id, sources.get(e.source_component_id!)]),
  )
  const stages = json.filter((e) => e.type === "cad_explosion_stage")
  const stageNames = new Map(
    stages.map((e) => [e.cad_explosion_stage_id, e.name]),
  )
  const moves = json.filter((e) => e.type === "cad_explosion_move")
  return stages.map((stage) => ({
    name: stage.name,
    order: stage.order,
    members: stage.cad_component_ids.map((id) => cadNames.get(id)).sort(),
    moves: moves
      .filter((e) => e.cad_explosion_stage_id === stage.cad_explosion_stage_id)
      .map((move) => ({
        order: move.order,
        translation: move.translation,
        targets: move.targets.map((target) =>
          target.type === "cad_component"
            ? { type: target.type, name: cadNames.get(target.cad_component_id) }
            : target.type === "cad_explosion_stage"
              ? {
                  type: target.type,
                  name: stageNames.get(target.cad_explosion_stage_id),
                }
              : target,
        ),
      })),
  }))
}

test("the real-board JSON program matches its authored TSX rendered through core's CAD phases", async () => {
  const sha256 = async (filename: string) =>
    createHash("sha256")
      .update(
        await Bun.file(
          new URL(
            `../stories/fixtures/rp2040-motor-assembly/${filename}`,
            import.meta.url,
          ),
        ).bytes(),
      )
      .digest("hex")
  expect(await sha256("assembly.tsx")).toBe(generation.assemblySourceSha256)
  expect(await sha256("assembled.circuit.json")).toBe(
    generation.circuitJsonSha256,
  )
  const circuit = new Circuit()
  // The PCB is kept in its pinned build; render the actual mechanical assembly
  // source here to prevent the checked-in JSON drifting from the authored TSX.
  circuit.add(<Rp2040MotorAssembly board={<></>} />)
  await circuit.renderUntilSettled()
  const generated = circuit.getCircuitJson()
  expect(
    generated.filter((e) => e.type === "cad_explosion_stage"),
  ).toHaveLength(4)
  expect(generated.filter((e) => e.type === "cad_explosion_move")).toHaveLength(
    4,
  )
  expect(namedProgram(generated)).toEqual(
    namedProgram(assembled as AnyCircuitElement[]),
  )
}, 30_000)
