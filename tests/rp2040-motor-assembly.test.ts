import { expect, test } from "bun:test"
import type { AnyCircuitElement, CadComponent } from "circuit-json"
import raw from "../stories/fixtures/rp2040-motor-assembly/assembled.circuit.json"
import { getCircuitJsonAssemblyExplosion } from "@tscircuit/core"

const assembled = raw as unknown as AnyCircuitElement[]
const cad = assembled.filter(
  (e): e is CadComponent => e.type === "cad_component",
)
const explodedPositions = Object.fromEntries(
  getCircuitJsonAssemblyExplosion(JSON.parse(JSON.stringify(assembled)))
    .circuitJson.filter((e): e is CadComponent => e.type === "cad_component")
    .map((e) => [e.cad_component_id, e.position]),
)

test("real RP2040 fixture includes routed four-layer PCB and all mechanical parts", () => {
  const board = assembled.find((e) => e.type === "pcb_board")!
  expect(board.type).toBe("pcb_board")
  if (board.type !== "pcb_board") throw new Error("Missing PCB")
  expect(board.num_layers).toBe(4)
  expect(board.width).toBeCloseTo(42.3, 3)
  expect(board.height).toBeCloseTo(42.32, 3)
  expect(assembled.filter((e) => e.type === "pcb_trace")).toHaveLength(300)
  expect(assembled.filter((e) => e.type === "pcb_via")).toHaveLength(303)
  expect(cad).toHaveLength(117)
  const sources = assembled.filter((e) => e.type === "source_component")
  for (const name of [
    "motor",
    "cover",
    ...[1, 2, 3, 4].flatMap((i) => [`spacer${i}`, `bolt${i}`]),
  ]) {
    const source = sources.find((e) => e.name === name)!
    expect(source).toBeDefined()
    expect(
      cad.some((c) => c.source_component_id === source.source_component_id),
    ).toBe(true)
  }
})

test("exported explosion moves ten mechanical parts and keeps all PCB components fixed", () => {
  const moved = cad.filter(
    (e) =>
      JSON.stringify(e.position) !==
      JSON.stringify(explodedPositions[e.cad_component_id]),
  )
  expect(moved).toHaveLength(10)
  expect(moved.every((e) => !e.pcb_component_id)).toBe(true)
  for (const e of cad.filter((e) => e.pcb_component_id))
    expect(explodedPositions[e.cad_component_id]).toEqual(e.position)
  const sources = assembled.filter((e) => e.type === "source_component")
  const deltaZ = (name: string) => {
    const source = sources.find((e) => e.name === name)!
    const component = cad.find(
      (e) => e.source_component_id === source.source_component_id,
    )!
    return (
      explodedPositions[component.cad_component_id]!.z - component.position.z
    )
  }
  expect(deltaZ("bolt1")).toBe(65)
  expect(deltaZ("cover")).toBe(24)
  expect(deltaZ("motor")).toBe(-24)
  expect(deltaZ("spacer1")).toBe(-12)
  expect(
    assembled.filter((e) => e.type === "cad_explosion_stage"),
  ).toHaveLength(4)
  const moves = assembled.filter((e) => e.type === "cad_explosion_move")
  expect(moves).toHaveLength(4)
  expect(
    moves[0]?.targets.some((target) => target.type === "cad_explosion_stage"),
  ).toBe(true)
  const lifted = getCircuitJsonAssemblyExplosion(assembled, {
    throughStageRef: "RP2040_NEMA17.lift-cover",
  })
  for (const record of lifted.circuitJson) {
    if (record.type !== "cad_component") continue
    const original = cad.find(
      (c) => c.cad_component_id === record.cad_component_id,
    )!
    const name = sources.find(
      (source) => source.source_component_id === record.source_component_id,
    )?.name
    const liftsWithCover = name === "cover" || /^bolt[1-4]$/.test(name ?? "")
    expect(record.position.z - original.position.z).toBe(
      liftsWithCover ? 24 : 0,
    )
    const final = explodedPositions[record.cad_component_id]!
    expect(final.x).toBe(original.position.x)
    expect(final.y).toBe(original.position.y)
  }
})
