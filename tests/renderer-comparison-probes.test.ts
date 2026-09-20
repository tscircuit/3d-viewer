import { expect, test } from "bun:test"
import { comparisonCases } from "./fixtures/renderer-parity/cases"
import { compileRendererCircuit } from "./fixtures/renderer-parity/compile-circuit"

test("rotation repros compile quarter-turn mounting corrections and real TO-92 holes from TSX", async () => {
  const rotations = comparisonCases.filter(
    (definition) => definition.category === "rotation",
  )
  expect(rotations).toHaveLength(3)
  const expected = [
    { x: 90, y: 0, z: 0 },
    { x: 0, y: 90, z: 0 },
    { x: 90, y: 90, z: 0 },
  ]
  for (const [index, definition] of rotations.entries()) {
    const { circuitJson, target, sourceCode } =
      await compileRendererCircuit(definition)
    expect(target.rotation).toEqual(expected[index]!)
    expect(target.position).toEqual({ x: 1.27, y: 0, z: 0.7 })
    expect(sourceCode).toContain("rotationOffset")
    expect(sourceCode).toContain("<board")
    const holes = circuitJson.filter(
      (element) => element.type === "pcb_plated_hole",
    )
    expect(holes).toHaveLength(3)
    expect(holes.map((hole) => [hole.x, hole.y])).toEqual([
      [0, 0],
      [1.27, 0],
      [2.54, 0],
    ])
    for (const hole of holes) {
      if (hole.shape === "circular_hole_with_rect_pad") {
        expect(hole.hole_diameter).toBe(0.75)
        expect(hole.rect_pad_width).toBe(1.05)
        expect(hole.rect_pad_height).toBe(1.5)
      } else if (hole.shape === "pill") {
        expect(hole.hole_width).toBe(0.75)
        expect(hole.hole_height).toBe(0.75)
        expect(hole.outer_width).toBe(1.05)
        expect(hole.outer_height).toBe(1.5)
      } else {
        throw new Error("Unexpected TO-92 mounting aperture")
      }
    }
    const board = circuitJson.find((element) => element.type === "pcb_board")
    expect(board?.thickness).toBe(1.4)
    expect(definition.physicalExpectation?.correctRenderer).toBe("viewer")
  }
})
