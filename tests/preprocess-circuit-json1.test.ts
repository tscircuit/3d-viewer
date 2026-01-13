import { expect, test } from "bun:test"
import type { CadComponent } from "circuit-json"
import { addFauxBoardIfNeeded } from "../src/utils/preprocess-circuit-json"

const createCadComponent = (
  z: number,
  layer?: "top" | "bottom",
): CadComponent => ({
  type: "cad_component",
  cad_component_id: "cad-1",
  pcb_component_id: "pcb-1",
  source_component_id: "source-1",
  position: { x: 0, y: 0, z },
  layer,
})

test("bottom layer components get negative z offset on faux board", () => {
  const result = addFauxBoardIfNeeded([createCadComponent(0, "bottom")])

  const updatedComponent = result.find(
    (element) => element.type === "cad_component",
  ) as CadComponent

  // Bottom layer should be at -boardThickness/2 = -0.8
  expect(updatedComponent.position?.z).toBeCloseTo(-0.8)
})
