import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getExplodedViewSceneConfig } from "../src/utils/get-exploded-view-scene-config"

const circuitJson = [
  {
    type: "cad_component",
    cad_component_id: "cad_pcb",
    source_component_id: "source_pcb",
    position: { x: 0, y: 0, z: 0 },
  },
  {
    type: "cad_component",
    cad_component_id: "cad_lid",
    source_component_id: "source_lid",
    position: { x: 0, y: 0, z: 0 },
    explode_offset: { x: 0, y: 0, z: 30 },
  },
] as AnyCircuitElement[]

test("reads resolved exploded-view offsets from Circuit JSON", () => {
  const sceneConfig = getExplodedViewSceneConfig(circuitJson)

  expect(sceneConfig.parts).toHaveLength(1)
  expect(sceneConfig.parts[0]?.cadComponentId).toBe("cad_lid")
  expect(sceneConfig.parts[0]?.offset.toArray()).toEqual([0, 0, 30])
})

test("keeps omitted components fixed and ignores zero offsets", () => {
  const sceneConfig = getExplodedViewSceneConfig(
    circuitJson.map((element) =>
      element.type === "cad_component"
        ? { ...element, explode_offset: { x: 0, y: 0, z: 0 } }
        : element,
    ),
  )

  expect(sceneConfig).toEqual({ parts: [] })
})
