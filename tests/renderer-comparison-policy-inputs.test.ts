import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { applyComparisonCase } from "./fixtures/renderer-parity/apply-case"
import { policyCases } from "./fixtures/renderer-parity/policy-cases"
import { policyModelUrls } from "./fixtures/renderer-parity/policy-inputs"

test("policy stories preserve original omissions and change only labelled control fields", async () => {
  for (const definition of policyCases) {
    const seed: AnyCircuitElement[] = await Bun.file(
      `${import.meta.dir}/fixtures/renderer-parity/${definition.seed}`,
    ).json()
    const original = structuredClone(seed)
    const expected = structuredClone(seed)
    for (const element of expected) {
      if (element.type !== "cad_component") continue
      for (const field of [
        "model_obj_url",
        "model_glb_url",
        "model_gltf_url",
        "model_step_url",
        "model_stl_url",
      ] as const) {
        const url = element[field]
        if (url && policyModelUrls[url]) element[field] = policyModelUrls[url]
      }
    }
    const expectedTarget = expected.find(
      (element) => element.type === "cad_component",
    )
    if (!expectedTarget || expectedTarget.type !== "cad_component")
      throw new Error("Missing seed target")
    if ("origin" in definition)
      expectedTarget.model_origin_position = { x: 1.27, y: 0, z: 0 }
    if ("position" in definition)
      expectedTarget.position = { x: 0, y: 0, z: 1.8 }
    const { circuit, target } = applyComparisonCase(seed, definition)
    expect(seed).toEqual(original)
    if ("commonScaleControl" in definition) {
      expect(target.model_obj_url).toBe("assets/policy/scale-fit.obj")
      expect(target.model_stl_url).toBeUndefined()
      expect(target.position).toEqual({ x: 0, y: 0, z: 0.8 })
      expect(target.model_unit_to_mm_scale_factor).toBe(2)
      expect(target.size).toEqual({ x: 1, y: 1, z: 1 })
      expect(
        circuit.find((element) => element.type === "pcb_board"),
      ).toMatchObject({
        width: 4,
        height: 4,
        thickness: 1.6,
      })
    } else {
      expect(circuit).toEqual(expected)
    }
    if (definition.id.includes("omitted-position")) {
      expect(Object.hasOwn(target, "position")).toBe(false)
      expect(Object.hasOwn(target, "source_component_id")).toBe(false)
    }
    if (
      definition.id === "to92-native-origin" ||
      definition.id === "flashlight-native-origins"
    ) {
      expect(Object.hasOwn(target, "model_origin_position")).toBe(false)
    }
    if (definition.id === "scale-fit-original-stl") {
      expect(circuit.some((element) => element.type === "pcb_board")).toBe(
        false,
      )
      expect(target.position.z).toBe(0)
    }
  }
})
