import { expect, test } from "bun:test"
import type { CadComponent } from "circuit-json"
import { addFauxBoardIfNeeded } from "../src/utils/preprocess-circuit-json"

const createCadComponent = (z: number): CadComponent => ({
  type: "cad_component",
  cad_component_id: "cad-1",
  pcb_component_id: "pcb-1",
  source_component_id: "source-1",
  position: { x: 0, y: 0, z },
})

test("respects existing cad component z offsets when adding faux board", () => {
  const result = addFauxBoardIfNeeded([createCadComponent(1)])

  const updatedComponent = result.find(
    (element) => element.type === "cad_component",
  ) as CadComponent

  expect(updatedComponent.position?.z).toBeCloseTo(1.8)
})
