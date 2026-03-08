import type { AnyCircuitElement } from "circuit-json"
import { expect, test } from "bun:test"
import { BoardGeomBuilder } from "../src/BoardGeomBuilder"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board_1",
    width: 20,
    height: 20,
    center: { x: 0, y: 0 },
    thickness: 1.6,
    material: "fr4",
    num_layers: 2,
  } as any,
  {
    type: "pcb_silkscreen_path",
    pcb_silkscreen_path_id: "ssp_1",
    pcb_component_id: "cmp_1",
    layer: "top",
    route: [
      { x: -5, y: -5 },
      { x: 5, y: -5 },
      { x: 5, y: 5 },
      { x: -5, y: 5 },
    ],
    stroke_width: 0.15,
  } as any,
  {
    type: "pcb_silkscreen_line",
    pcb_silkscreen_line_id: "ssl_1",
    pcb_component_id: "cmp_1",
    layer: "top",
    x1: -3,
    y1: 0,
    x2: 3,
    y2: 0,
    stroke_width: 0.1,
  } as any,
  {
    type: "pcb_silkscreen_circle",
    pcb_silkscreen_circle_id: "ssc_1",
    pcb_component_id: "cmp_1",
    layer: "bottom",
    center: { x: 0, y: 0 },
    radius: 2,
    stroke_width: 0.12,
  } as any,
  {
    type: "pcb_silkscreen_rect",
    pcb_silkscreen_rect_id: "ssr_1",
    pcb_component_id: "cmp_1",
    layer: "top",
    center: { x: 0, y: 0 },
    width: 4,
    height: 2,
    is_filled: true,
  } as any,
]

test("BoardGeomBuilder generates silkscreen geometries", () => {
  let resultGeoms: any[] = []

  const builder = new BoardGeomBuilder(circuitJson, (geoms) => {
    resultGeoms = geoms
  })

  // Run builder to completion
  while (!builder.step(10)) {
    // continue
  }

  // Board + silkscreen path + line + circle + rect = at least 5 geoms
  expect(resultGeoms.length).toBeGreaterThanOrEqual(5)
})
