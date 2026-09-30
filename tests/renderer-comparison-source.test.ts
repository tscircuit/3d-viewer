import { expect, test } from "bun:test"
import { comparisonCases } from "./fixtures/renderer-parity/cases"
import { flashlightUsbObjUrl } from "./fixtures/renderer-parity/circuits/flashlight-origin.circuit"
import { compileRendererCircuit } from "./fixtures/renderer-parity/compile-circuit"
import { to92InlineStepUrl } from "./fixtures/renderer-parity/to92"

test("every physical repro starts from readable TSX and keeps its emitted placement fields", async () => {
  const repros = comparisonCases.filter(
    (definition) => definition.id !== "calibration",
  )
  expect(repros).toHaveLength(2)
  for (const definition of repros) {
    expect(definition.sourceFile).toEndWith(".circuit.tsx")
    expect(definition.physicalExpectation).toBeDefined()
    const { circuitJson, target, sourceCode } =
      await compileRendererCircuit(definition)
    expect(sourceCode).toContain("<board")
    expect(circuitJson.some((element) => element.type === "pcb_board")).toBe(
      true,
    )
    expect(
      circuitJson.some(
        (element) =>
          element.type === "pcb_plated_hole" || element.type === "pcb_smtpad",
      ),
    ).toBe(true)
    expect(target.position).toBeDefined()
    expect(target.source_component_id).toBeDefined()
    if (definition.category === "origin") {
      expect(target.model_origin_position).toBeUndefined()
    }
    for (const field of [
      "model_obj_url",
      "model_gltf_url",
      "model_glb_url",
      "model_step_url",
    ] as const) {
      if (target[field]) {
        expect(
          target[field] === to92InlineStepUrl ||
            target[field] === `${flashlightUsbObjUrl}&cachebust_origin=` ||
            target[field].startsWith("assets/real/"),
        ).toBe(true)
      }
    }
  }
})
