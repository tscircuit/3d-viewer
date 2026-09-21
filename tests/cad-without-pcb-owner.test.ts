import { addFauxBoardIfNeeded } from "../src/utils/preprocess-circuit-json"
import { expect, test } from "bun:test"
import type { AnyCircuitElement, CadComponent } from "circuit-json"
import { getCadPcbContext } from "../src/utils/get-cad-pcb-context"
import { getCadModelTransform } from "../src/utils/cad-model-transform"

test("mechanical CAD keeps its world position without borrowing a PCB owner", () => {
  const cad: CadComponent = {
    type: "cad_component",
    cad_component_id: "cad1",
    source_component_id: "source1",
    position: { x: 3, y: 4, z: 5 },
    layer: "bottom",
    model_object_fit: "contain_within_bounds",
    anchor_alignment: "center",
  }
  const circuit: AnyCircuitElement[] = [
    cad,
    {
      type: "pcb_component",
      pcb_component_id: "pcb1",
      source_component_id: "source1",
      center: { x: 0, y: 0 },
      width: 1,
      height: 1,
      rotation: 0,
      layer: "top",
      obstructs_within_bounds: true,
    },
  ]
  expect(getCadPcbContext(cad, circuit)).toEqual({
    pcbComponent: undefined,
    layer: "bottom",
    isThroughHole: false,
  })
  expect(
    getCadModelTransform(cad, {
      layer: "bottom",
      pcbThickness: 1.6,
      modelType: "gltf",
    }).position,
  ).toEqual([3, 4, 5])
  expect(addFauxBoardIfNeeded([cad])).toEqual([cad])
  const owned = { ...cad, pcb_component_id: "pcb1" }
  expect(addFauxBoardIfNeeded([cad, owned])[0]).toEqual(cad)
  expect(getCadPcbContext(owned, circuit).pcbComponent?.pcb_component_id).toBe(
    "pcb1",
  )
  expect(
    getCadModelTransform(owned, {
      layer: "bottom",
      pcbThickness: 1.6,
      modelType: "gltf",
    }).position,
  ).toEqual([3, 4, -6.6])
})
