import { expect, test } from "bun:test"
import { createElement } from "react"
import { Circuit } from "tscircuit"
import FlashlightOriginCircuit, {
  flashlightUsbObjUrl,
} from "./fixtures/renderer-parity/circuits/flashlight-origin.circuit"

test("authored flashlight preserves the real footprint and missing-origin USB placement", async () => {
  const circuit = new Circuit()
  circuit.add(createElement(FlashlightOriginCircuit))
  await circuit.renderUntilSettled()
  const generated = circuit.getCircuitJson()

  const board = generated.find((element) => element.type === "pcb_board")
  expect(board).toMatchObject({
    center: { x: 0, y: 0 },
    width: 12,
    height: 30,
    thickness: 1.4,
    num_layers: 2,
  })
  expect(
    generated.filter((element) => element.type === "pcb_component"),
  ).toHaveLength(4)

  const source = generated.find(
    (element) => element.type === "source_component" && element.name === "J1",
  )
  if (source?.type !== "source_component") {
    throw new Error("Missing source component J1")
  }
  expect(source.supplier_part_numbers).toEqual({ jlcpcb: ["C165948"] })

  const pcb = generated.find(
    (element) =>
      element.type === "pcb_component" &&
      element.source_component_id === source.source_component_id,
  )
  const cad = generated.find(
    (element) =>
      element.type === "cad_component" &&
      element.source_component_id === source.source_component_id,
  )
  if (pcb?.type !== "pcb_component" || cad?.type !== "cad_component") {
    throw new Error("Missing PCB or CAD component for J1")
  }
  expect(pcb.center).toEqual({ x: 0, y: -10.7874994 })
  expect(pcb.rotation).toBe(0)
  expect(pcb.layer).toBe("top")
  expect(cad.model_obj_url).toBe(`${flashlightUsbObjUrl}&cachebust_origin=`)
  expect(cad.position).toEqual({ x: 0, y: -13.2874994, z: 0.7 })
  expect(cad.rotation).toEqual({ x: 0, y: 0, z: 180 })
  expect(cad.model_origin_position).toBeUndefined()

  for (const [type, count] of [
    ["pcb_smtpad", 16],
    ["pcb_plated_hole", 4],
    ["pcb_hole", 2],
  ] as const) {
    expect(
      generated.filter(
        (element) =>
          element.type === type &&
          element.pcb_component_id === pcb.pcb_component_id,
      ),
    ).toHaveLength(count)
  }
})
