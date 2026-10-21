import { expect, test } from "bun:test"
import { gunzipSync } from "node:zlib"
import type { CircuitJson } from "circuit-json"

test("TMDS62LEVM repro retains the board elements that block 3D rendering", async () => {
  const fixtureBytes = await Bun.file(
    new URL(
      "../stories/assets/repros/tmds62levm-full-board-3d.circuit.json.gz",
      import.meta.url,
    ),
  ).arrayBuffer()
  const circuitJson: CircuitJson = JSON.parse(
    new TextDecoder().decode(gunzipSync(fixtureBytes)),
  )

  const elementCountByType = Object.groupBy(circuitJson, ({ type }) => type)

  expect({
    cadComponentCount: elementCountByType.cad_component?.length,
    pcbComponentCount: elementCountByType.pcb_component?.length,
    pcbCopperPourCount: elementCountByType.pcb_copper_pour?.length,
    pcbSmtPadCount: elementCountByType.pcb_smtpad?.length,
    pcbTraceCount: elementCountByType.pcb_trace?.length,
    pcbViaCount: elementCountByType.pcb_via?.length,
  }).toMatchInlineSnapshot(`
    {
      "cadComponentCount": 1586,
      "pcbComponentCount": 4853,
      "pcbCopperPourCount": 1136,
      "pcbSmtPadCount": 5478,
      "pcbTraceCount": 22211,
      "pcbViaCount": 3267,
    }
  `)
})
