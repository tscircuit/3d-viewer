import { expect, test } from "bun:test"
import type { PcbVia } from "circuit-json"
import { createViaPadMesh } from "../src/three-components/ViaPadMeshes"

const vias: PcbVia[] = [
  {
    type: "pcb_via",
    pcb_via_id: "via-top-bottom",
    x: 2,
    y: -3,
    outer_diameter: 1.2,
    hole_diameter: 0.6,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_via",
    pcb_via_id: "via-bottom-only",
    x: 4,
    y: 5,
    outer_diameter: 0.8,
    hole_diameter: 0.2,
    layers: ["bottom"],
  },
]

test("via pads use constant-size instanced analytic geometry", () => {
  const mesh = createViaPadMesh({
    vias,
    layer: "bottom",
    pcbThickness: 1.6,
  })

  expect(mesh).not.toBeNull()
  expect(mesh!.count).toBe(2)
  expect(mesh!.geometry.getAttribute("position").count).toBe(4)
  expect(mesh!.geometry.getAttribute("innerRatio").count).toBe(2)
  expect(mesh!.geometry.getAttribute("innerRatio").getX(0)).toBeCloseTo(0.5)
  expect(mesh!.geometry.getAttribute("innerRatio").getX(1)).toBeCloseTo(0.25)
  expect(mesh!.userData.previewOnly).toBe(true)

  mesh!.geometry.dispose()
  ;(mesh!.material as { dispose: () => void }).dispose()
})

test("via pads respect connected copper layers", () => {
  const mesh = createViaPadMesh({
    vias,
    layer: "top",
    pcbThickness: 1.6,
  })

  expect(mesh).not.toBeNull()
  expect(mesh!.count).toBe(1)

  mesh!.geometry.dispose()
  ;(mesh!.material as { dispose: () => void }).dispose()
})
