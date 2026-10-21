import { expect, test } from "bun:test"
import { cad_component } from "circuit-json"
import gimbalAssembly from "../stories/assets/gimbal-assembly.json"
import { getAssemblyCadComponentIds } from "../src/utils/get-assembly-cad-component-ids"

const cadComponents = gimbalAssembly
  .filter((element) => element.type === "cad_component")
  .map((cad) => cad_component.parse(cad))

test("the full gimbal fixture hides 50 assembly parts and keeps all 74 PCB components", () => {
  const ids = new Set(getAssemblyCadComponentIds(cadComponents))

  expect(ids.size).toBe(50)
  expect(
    cadComponents.filter((cad) => !ids.has(cad.cad_component_id)),
  ).toHaveLength(74)
  expect(
    cadComponents
      .filter((cad) => ids.has(cad.cad_component_id))
      .every((cad) => !cad.pcb_component_id),
  ).toBe(true)
  expect(
    cadComponents
      .filter((cad) => !ids.has(cad.cad_component_id))
      .every((cad) => cad.pcb_component_id),
  ).toBe(true)
  expect(
    gimbalAssembly.filter((element) => element.type === "pcb_board"),
  ).toHaveLength(1)
})

test("a board with only mounted CAD components has no assembly to hide", () => {
  expect(
    getAssemblyCadComponentIds(
      cadComponents.filter((cad) => cad.pcb_component_id),
    ),
  ).toEqual([])
})

test("an empty circuit has no assembly to hide", () => {
  expect(getAssemblyCadComponentIds([])).toEqual([])
})
