import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { createElement } from "react"
import { Circuit } from "tscircuit"
import FlashlightOriginCircuit from "./fixtures/renderer-parity/circuits/flashlight-origin.circuit"

const physicalFields = new Set([
  "type",
  "shape",
  "hole_shape",
  "x",
  "y",
  "width",
  "height",
  "hole_diameter",
  "outer_diameter",
  "hole_width",
  "hole_height",
  "outer_width",
  "outer_height",
  "ccw_rotation",
  "layer",
  "layers",
  "is_covered_with_solder_mask",
])

function physicalGeometry(
  elements: AnyCircuitElement[],
  pcbComponentId: string,
) {
  return elements
    .filter(
      (element) =>
        (element.type === "pcb_smtpad" ||
          element.type === "pcb_plated_hole" ||
          element.type === "pcb_hole") &&
        element.pcb_component_id === pcbComponentId,
    )
    .map((element) =>
      JSON.stringify(
        Object.fromEntries(
          Object.entries(element)
            .filter(([key]) => physicalFields.has(key))
            .sort(([a], [b]) => a.localeCompare(b))
            // Ignore only floating-point roundoff, not manufacturing dimensions.
            .map(([key, value]) => [
              key,
              typeof value === "number" ? Math.round(value * 1e9) / 1e9 : value,
            ]),
        ),
      ),
    )
    .sort()
}

test("authored flashlight preserves the captured footprint and missing-origin USB placement", async () => {
  const original: AnyCircuitElement[] = await Bun.file(
    `${import.meta.dir}/fixtures/renderer-parity/policy/flashlight.circuit.json`,
  ).json()
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

  for (const [oldName, newName] of [
    ["unnamed_chip2", "J1"],
    ["SW1", "SW1"],
    ["R1", "R1"],
    ["LED", "D1"],
  ]) {
    const oldSource = original.find(
      (element) =>
        element.type === "source_component" && element.name === oldName,
    )
    const newSource = generated.find(
      (element) =>
        element.type === "source_component" && element.name === newName,
    )
    if (
      oldSource?.type !== "source_component" ||
      newSource?.type !== "source_component"
    ) {
      throw new Error(`Missing component ${oldName} / ${newName}`)
    }
    const oldPcb = original.find(
      (element) =>
        element.type === "pcb_component" &&
        element.source_component_id === oldSource.source_component_id,
    )
    const newPcb = generated.find(
      (element) =>
        element.type === "pcb_component" &&
        element.source_component_id === newSource.source_component_id,
    )
    const oldCad = original.find(
      (element) =>
        element.type === "cad_component" &&
        element.source_component_id === oldSource.source_component_id,
    )
    const newCad = generated.find(
      (element) =>
        element.type === "cad_component" &&
        element.source_component_id === newSource.source_component_id,
    )
    if (
      oldPcb?.type !== "pcb_component" ||
      newPcb?.type !== "pcb_component" ||
      oldCad?.type !== "cad_component" ||
      newCad?.type !== "cad_component"
    ) {
      throw new Error(`Missing PCB or CAD component for ${newName}`)
    }
    expect(newPcb.center.x).toBeCloseTo(oldPcb.center.x, 9)
    expect(newPcb.center.y).toBeCloseTo(oldPcb.center.y, 9)
    expect(newPcb.width).toBeCloseTo(oldPcb.width, 9)
    expect(newPcb.height).toBeCloseTo(oldPcb.height, 9)
    expect(newPcb.rotation).toBe(oldPcb.rotation)
    expect(newPcb.layer).toBe(oldPcb.layer)
    expect(physicalGeometry(generated, newPcb.pcb_component_id)).toEqual(
      physicalGeometry(original, oldPcb.pcb_component_id),
    )
    expect(newCad.position.x).toBeCloseTo(oldCad.position.x, 9)
    expect(newCad.position.y).toBeCloseTo(oldCad.position.y, 9)
    expect(newCad.position.z).toBeCloseTo(oldCad.position.z, 9)
    expect(newCad.model_origin_position).toBeUndefined()
    expect(newCad).toMatchObject({
      rotation: oldCad.rotation,
      model_origin_alignment: oldCad.model_origin_alignment,
      anchor_alignment: oldCad.anchor_alignment,
      footprinter_string: oldCad.footprinter_string,
    })

    if (newName === "J1") {
      expect(newSource.supplier_part_numbers).toEqual({ jlcpcb: ["C165948"] })
      expect(newCad.model_obj_url).toBe("assets/real/flashlight-usb.obj")
      expect(newCad.position.y).toBeCloseTo(-13.2874994, 9)
      expect(newCad.rotation).toEqual({ x: 0, y: 0, z: 180 })
      for (const [type, count] of [
        ["pcb_smtpad", 16],
        ["pcb_plated_hole", 4],
        ["pcb_hole", 2],
      ] as const) {
        expect(
          generated.filter(
            (element) =>
              element.type === type &&
              element.pcb_component_id === newPcb.pcb_component_id,
          ),
        ).toHaveLength(count)
      }
    }
  }
})
