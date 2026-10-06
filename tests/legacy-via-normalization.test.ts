import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbBoard, PcbVia } from "circuit-json"
import { getPcbVias } from "../src/utils/get-pcb-vias"
import { preprocessCircuitJson } from "../src/utils/preprocess-circuit-json"
import { ssopRotatedCircuit } from "./fixtures/legacy-story-textures"

test("viewer preprocessing preserves canonical vias and immutably upgrades supplied legacy layer spans", () => {
  const board: PcbBoard = {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    thickness: 1.6,
    num_layers: 4,
    material: "fr4",
  }
  const via: PcbVia = {
    type: "pcb_via",
    pcb_via_id: "modern_via",
    x: 0,
    y: 0,
    outer_diameter: 0.6,
    hole_diameter: 0.3,
    layers: ["top", "inner1"],
  }
  // Explicit modern layers take precedence, even with conflicting old fields.
  const modern: AnyCircuitElement[] = [
    board,
    { ...via, from_layer: "bottom", to_layer: "top" },
  ]
  const modernResult = preprocessCircuitJson(modern)
  expect(modernResult).toBe(modern)
  expect(modernResult[0]).toBe(board)
  expect(modernResult[1]).toBe(modern[1]!)
  expect((modernResult[1] as PcbVia).layers).toEqual(["top", "inner1"])

  for (const [from_layer, to_layer] of [
    ["top", "bottom"],
    ["bottom", "top"],
    ["top", "inner1"],
  ] as const) {
    const legacy = {
      type: "pcb_via",
      x: 0,
      y: 0,
      outer_diameter: 0.6,
      hole_diameter: 0.3,
      from_layer,
      to_layer,
    }
    const input = [board, legacy] as unknown as AnyCircuitElement[]
    const before = JSON.stringify(input)
    const result = preprocessCircuitJson(input)
    const converted = result[1] as PcbVia
    expect(result).not.toBe(input)
    expect(result[0]).toBe(board)
    expect(converted).not.toBe(legacy)
    expect(converted.layers).toEqual([from_layer, to_layer])
    expect(converted.x).toBe(0)
    expect(converted.y).toBe(0)
    expect(converted.outer_diameter).toBe(0.6)
    expect(converted.hole_diameter).toBe(0.3)
    expect(typeof converted.pcb_via_id).toBe("string")
    expect(converted.pcb_via_id.length).toBeGreaterThan(0)
    expect((preprocessCircuitJson(input)[1] as PcbVia).pcb_via_id).toBe(
      converted.pcb_via_id,
    )
    expect(JSON.stringify(input)).toBe(before)
  }

  const storyResult = preprocessCircuitJson(ssopRotatedCircuit)
  const storyVias = storyResult.filter(
    (element): element is PcbVia => element.type === "pcb_via",
  )
  expect(new Set(storyVias.map((element) => element.pcb_via_id)).size).toBe(4)
  expect(getPcbVias(storyResult)).toHaveLength(4)
  expect(preprocessCircuitJson(storyResult)).toBe(storyResult)

  // A route transition at the same location must reuse its converted physical
  // via rather than creating a second drill and copper barrel.
  const duplicateRoute = {
    type: "pcb_trace",
    pcb_trace_id: "trace",
    route: [
      { route_type: "via", x: 0, y: 0, from_layer: "bottom", to_layer: "top" },
    ],
  }
  const legacyVia = {
    type: "pcb_via",
    x: 0,
    y: 0,
    outer_diameter: 0.6,
    hole_diameter: 0.3,
    from_layer: "top",
    to_layer: "bottom",
  }
  const deduplicated = getPcbVias(
    preprocessCircuitJson([
      board,
      legacyVia,
      duplicateRoute,
    ] as unknown as AnyCircuitElement[]),
  )
  expect(deduplicated).toHaveLength(1)
  expect(deduplicated[0]!.outer_diameter).toBe(0.6)
  expect(deduplicated[0]!.hole_diameter).toBe(0.3)
})
