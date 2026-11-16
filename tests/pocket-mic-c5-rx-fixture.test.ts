import { expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { type AnyCircuitElement, cad_explosion_stage } from "circuit-json"
import { pocketMicC5RxBoardMoves } from "../stories/fixtures/pocket-mic-c5-rx/board-moves"

const fixture = readFileSync(
  new URL(
    "../stories/fixtures/pocket-mic-c5-rx/assembled.circuit.json",
    import.meta.url,
  ),
)
const circuitJson = JSON.parse(fixture.toString("utf8")) as AnyCircuitElement[]

test("the C5 RX fixture preserves all 2,793 released electrical records byte for byte", () => {
  const electricalRecordCount = 2793
  const electricalPrefix = Buffer.from(
    `${JSON.stringify(circuitJson.slice(0, electricalRecordCount)).slice(0, -1)},`,
  )
  const releasedElectricalPrefixSha256 =
    "28065a41291d11bba2ab4a35c97ca7480085109d20c6f28e8cd8bda38bc60d84"

  expect(fixture.subarray(0, electricalPrefix.length)).toEqual(electricalPrefix)
  expect(createHash("sha256").update(electricalPrefix).digest("hex")).toBe(
    releasedElectricalPrefixSha256,
  )
})

test("the C5 RX board cues reference authored stages with no native CAD moves", () => {
  const stages = circuitJson
    .filter((entry) => entry.type === "cad_explosion_stage")
    .map((stage) => cad_explosion_stage.parse(stage))

  expect(stages.map((stage) => stage.name)).toEqual([
    "pocket-rx.lift-cover",
    "pocket-rx.release-controls",
    "pocket-rx.lift-pcb",
    "pocket-rx.park-pcb",
  ])
  for (const cue of pocketMicC5RxBoardMoves) {
    const stage = stages.find((item) => item.name === cue.stageName)
    expect(stage?.cad_component_ids).toEqual([])
    expect(
      circuitJson.some(
        (entry) =>
          entry.type === "cad_explosion_move" &&
          entry.cad_explosion_stage_id === stage?.cad_explosion_stage_id,
      ),
    ).toBe(false)
  }
})
