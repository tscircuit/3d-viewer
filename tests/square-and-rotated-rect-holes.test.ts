import { expect, test } from "bun:test"
import { measureVolume } from "@jscad/modeling/src/measurements"
import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import ManifoldModule from "manifold-3d"
import { BoardGeomBuilder } from "../src/BoardGeomBuilder"
import { createManifoldBoard } from "../src/utils/manifold/create-manifold-board"
import { processNonPlatedHolesForManifold } from "../src/utils/manifold/process-non-plated-holes"

const baseBoard: PcbBoard = {
  type: "pcb_board",
  pcb_board_id: "board_0",
  center: { x: 0, y: 0 },
  width: 20,
  height: 20,
  thickness: 1.6,
  num_layers: 2,
  material: "fr4",
}

const circuitWithHoles: AnyCircuitElement[] = [
  baseBoard,
  {
    type: "pcb_hole",
    pcb_hole_id: "hole_square",
    hole_shape: "square",
    hole_diameter: 2,
    x: -5,
    y: 0,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "hole_rotated_rect",
    hole_shape: "rotated_rect",
    hole_width: 4,
    hole_height: 2,
    ccw_rotation: 45,
    x: 0,
    y: 0,
  } as unknown as AnyCircuitElement,
  {
    type: "pcb_hole",
    pcb_hole_id: "hole_rounded_rect",
    hole_shape: "rect",
    hole_width: 4,
    hole_height: 2,
    rect_border_radius: 0.5,
    x: 5,
    y: 0,
  } as unknown as AnyCircuitElement,
]

test("BoardGeomBuilder subtracts square, rotated_rect, and rounded rect non-plated holes", () => {
  const solidBuilder = new BoardGeomBuilder([baseBoard], () => {})
  while (!solidBuilder.step(100)) {}
  const solidVolume = measureVolume(solidBuilder.getGeoms()[0]!)

  const drilledBuilder = new BoardGeomBuilder(circuitWithHoles, () => {})
  while (!drilledBuilder.step(100)) {}
  const drilledVolume = measureVolume(drilledBuilder.getGeoms()[0]!)

  const thickness = baseBoard.thickness!
  const squareVol = 2 * 2 * thickness
  const rotatedRectVol = 4 * 2 * thickness
  const roundedRectArea = 4 * 2 - (4 - Math.PI) * 0.5 * 0.5
  const roundedRectVol = roundedRectArea * thickness
  const expectedSubtractedVolume = squareVol + rotatedRectVol + roundedRectVol

  expect(solidVolume - drilledVolume).toBeCloseTo(expectedSubtractedVolume, 1)
})

test("processNonPlatedHolesForManifold drills square, rotated_rect, and rounded rect holes", async () => {
  const manifold = await ManifoldModule()
  manifold.setup()
  const { Manifold, CrossSection } = manifold
  const cleanup: Array<{ delete(): void }> = []

  try {
    const thickness = baseBoard.thickness!
    const { boardOp } = createManifoldBoard(
      Manifold,
      CrossSection,
      baseBoard,
      thickness,
      cleanup,
    )
    const { nonPlatedHoleBoardDrills } = processNonPlatedHolesForManifold(
      Manifold,
      CrossSection,
      circuitWithHoles,
      thickness,
      cleanup,
    )
    expect(nonPlatedHoleBoardDrills).toHaveLength(3)

    const allDrills = Manifold.union(nonPlatedHoleBoardDrills)
    const drilledBoard = boardOp.subtract(allDrills)
    cleanup.push(allDrills, drilledBoard)

    const solidVolume = boardOp.volume()
    const drilledVolume = drilledBoard.volume()

    const squareVol = 2 * 2 * thickness
    const rotatedRectVol = 4 * 2 * thickness
    const roundedRectArea = 4 * 2 - (4 - Math.PI) * 0.5 * 0.5
    const roundedRectVol = roundedRectArea * thickness
    const expectedSubtractedVolume = squareVol + rotatedRectVol + roundedRectVol

    expect(solidVolume - drilledVolume).toBeCloseTo(expectedSubtractedVolume, 1)
  } finally {
    for (const item of new Set(cleanup)) {
      item.delete()
    }
  }
})
