import { expect, test } from "bun:test"
import type { AnyCircuitElement, CadComponent } from "circuit-json"
import { isLegacyFdmEnclosure } from "../src/utils/is-legacy-fdm-enclosure"

/** Classification is structural and does not depend on an enclosure name or ID. */
test("recognizes only the existing synthetic enclosure CAD representation", () => {
  const cad = {
    type: "cad_component",
    cad_component_id: "cad_case",
    source_component_id: "source_case",
    pcb_component_id: "pcb_case",
    position: { x: 0, y: 0, z: -6 },
    model_jscad: { type: "cuboid", size: [44, 28, 16] },
    model_origin_alignment: "bottom_center_of_component",
    model_object_fit: "contain_within_bounds",
    anchor_alignment: "center",
  } as CadComponent
  const owner = {
    type: "pcb_component",
    pcb_component_id: "pcb_case",
    source_component_id: "source_case",
    center: { x: 0, y: 0 },
    width: 0,
    height: 0,
    layer: "top",
    rotation: 0,
    do_not_place: true,
    is_allowed_to_be_off_board: true,
    obstructs_within_bounds: false,
  } as AnyCircuitElement

  expect(isLegacyFdmEnclosure(cad, [owner])).toBe(true)
  expect(
    isLegacyFdmEnclosure(cad, [
      { ...owner, width: 10, do_not_place: false } as AnyCircuitElement,
    ]),
  ).toBe(false)
  expect(
    isLegacyFdmEnclosure({ ...cad, model_jscad: undefined }, [owner]),
  ).toBe(false)
})
