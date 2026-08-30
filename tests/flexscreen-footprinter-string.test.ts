import { expect, test } from "bun:test"
import type { CadComponent } from "circuit-json"
import * as THREE from "three"
import { renderComponent } from "../src/utils/render-component"

test("renders a flexscreen cad_component footprinter string", async () => {
  const scene = new THREE.Scene()
  const flexscreen: CadComponent = {
    type: "cad_component",
    cad_component_id: "cad_component_flexscreen",
    pcb_component_id: "pcb_component_flexscreen",
    source_component_id: "source_component_flexscreen",
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    model_origin_position: { x: 0, y: 0, z: 0 },
    model_object_fit: "contain_within_bounds",
    anchor_alignment: "center",
    footprinter_string:
      "flexscreen_w40mm_h22.5mm_flex60mm_foldsabove_distance20mm_foldstart9mm_outset6mm",
  }

  await renderComponent(flexscreen, scene)

  expect(scene.children.length).toBeGreaterThan(0)

  const bounds = new THREE.Box3().setFromObject(scene)
  expect(bounds.isEmpty()).toBe(false)
  expect(bounds.max.x - bounds.min.x).toBeGreaterThanOrEqual(40)
  expect(bounds.max.y - bounds.min.y).toBeGreaterThan(22.5)
  expect(bounds.max.z - bounds.min.z).toBeGreaterThan(1)
})
