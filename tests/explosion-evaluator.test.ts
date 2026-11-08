import { expect, test } from "bun:test"
import { getCircuitJsonAssemblyExplosion } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"
import { createExplosionEvaluator } from "../src/assembly-explosion/create-explosion-evaluator"

const loadSample = async (): Promise<AnyCircuitElement[]> =>
  Bun.file(
    new URL("../stories/fixtures/flex17-spur.json", import.meta.url),
  ).json()

const poses = (json: AnyCircuitElement[]) =>
  json.flatMap((element) => {
    if (element.type === "cad_component")
      return [{ id: element.cad_component_id, position: element.position }]
    if (element.type === "cad_reference_surface")
      return [
        { id: element.cad_reference_surface_id, position: element.center },
      ]
    return []
  })

test("lightweight playback matches core at each FLEX17 stage and within ordered moves", async () => {
  const json = await loadSample()
  const original = poses(json)
  const evaluate = createExplosionEvaluator(json)
  const stages = evaluate().stages
  for (const throughStageRef of stages) {
    for (const stageProgress of [0, 0.25, 0.5, 0.75, 1]) {
      const options = { throughStageRef, stageProgress }
      const actual = evaluate(options)
      const expected = getCircuitJsonAssemblyExplosion(json, options)
      expect(poses(actual.circuitJson)).toEqual(poses(expected.circuitJson))
      expect(actual.lines).toEqual(expected.lines)
      expect(actual.stages).toEqual(expected.stages)
    }
  }
  expect(poses(json)).toEqual(original)
})

test("playback shares immutable geometry instead of copying it per frame", async () => {
  const json = await loadSample()
  const evaluate = createExplosionEvaluator(json)
  const first = evaluate({ stageProgress: 0.25 })
  const second = evaluate({ stageProgress: 0.75 })
  for (const component of json) {
    if (component.type !== "cad_component") continue
    for (const view of [first, second]) {
      const result = view.circuitJson.find(
        (e) =>
          e.type === "cad_component" &&
          e.cad_component_id === component.cad_component_id,
      )
      expect(result?.type).toBe("cad_component")
      if (result?.type !== "cad_component") throw new Error("Missing component")
      expect(result.model_jscad).toBe(component.model_jscad)
      expect(result.position).not.toBe(component.position)
    }
  }
})
