import { expect, test } from "bun:test"
import { Box2, Vector2 } from "three"
import { Circuit } from "tscircuit"
import Daughtercard from "./fixtures/renderer-parity/circuits/m2-daughtercard.circuit"

test("the 0.8 mm M-key coupon has the correct two-sided contact banks and tongue", async () => {
  const circuit = new Circuit()
  circuit.add(<Daughtercard />)
  await circuit.renderUntilSettled()
  const elements = circuit.getCircuitJson()
  const board = elements.find((element) => element.type === "pcb_board")
  if (!board || board.width === undefined || board.height === undefined) {
    throw new Error("Daughtercard board dimensions are missing")
  }
  const edgeSource = elements.find(
    (element) =>
      element.type === "source_component" && element.name === "EDGE1",
  )
  if (!edgeSource || edgeSource.type !== "source_component") {
    throw new Error("M.2 edge component is missing")
  }
  const edge = elements.find(
    (element) =>
      element.type === "pcb_component" &&
      element.source_component_id === edgeSource.source_component_id,
  )
  if (!edge || edge.type !== "pcb_component") {
    throw new Error("M.2 footprint is missing")
  }
  const pads = elements
    .filter((element) => element.type === "pcb_smtpad")
    .filter((element) => element.pcb_component_id === edge.pcb_component_id)
  expect(pads).toHaveLength(67)
  expect(pads.filter((pad) => pad.layer === "top")).toHaveLength(34)
  expect(pads.filter((pad) => pad.layer === "bottom")).toHaveLength(33)
  expect(board.thickness).toBe(0.8)
  const pinNames = pads.flatMap((pad) => pad.port_hints ?? [])
  expect(new Set(pinNames).size).toBe(67)
  for (let pin = 1; pin <= 75; pin++) {
    expect(pinNames.includes(`pin${pin}`)).toBe(pin < 59 || pin > 66)
  }
  const insertionEdge = board.center.x - board.width / 2
  for (const pad of pads) {
    if (pad.shape !== "rect") throw new Error("Expected rectangular contacts")
    const leadingInset = pad.x - pad.width / 2 - insertionEdge
    expect(leadingInset).toBeCloseTo(0.5, 5)
    expect(leadingInset).toBeLessThanOrEqual(0.55)
    expect(pad.x + pad.width / 2 - insertionEdge).toBeCloseTo(2, 5)
    expect(Math.abs(pad.y) + pad.height / 2).toBeLessThan(board.height / 2)
    expect(pad.width).toBe(1.5)
    expect(pad.height).toBe(0.35)
    expect(Math.abs(pad.y - 6.125)).toBeGreaterThan(0.6 + pad.height / 2)
  }
  const rectangles = pads.filter((pad) => pad.shape === "rect")
  const odd = rectangles.filter((pad) => pad.layer === "top")
  const even = rectangles.filter((pad) => pad.layer === "bottom")
  expect(odd.find((pad) => pad.port_hints?.includes("pin1"))?.y).toBe(-9.25)
  expect(odd.find((pad) => pad.port_hints?.includes("pin75"))?.y).toBe(9.25)
  expect(even.find((pad) => pad.port_hints?.includes("pin2"))?.y).toBe(-9)
  expect(even.find((pad) => pad.port_hints?.includes("pin74"))?.y).toBe(9)
  const key = elements.find((element) => element.type === "pcb_cutout")
  if (!key || key.shape !== "polygon")
    throw new Error("Rounded M.2 key notch is missing")
  const keyPoints = key.points.map(({ x, y }) => new Vector2(x, y))
  const keyBounds = new Box2().setFromPoints(keyPoints)
  expect(keyBounds.min.x).toBeLessThan(insertionEdge)
  expect(keyBounds.max.x - insertionEdge).toBeCloseTo(3.5, 5)
  expect(keyBounds.getCenter(new Vector2()).y).toBeCloseTo(6.125, 5)
  expect(keyBounds.getSize(new Vector2()).y).toBeCloseTo(1.2, 5)
  const root = keyPoints.filter((point) => point.x >= -9.1)
  expect(root).toHaveLength(17)
  for (const point of root) {
    expect(point.distanceTo(new Vector2(-9.1, 6.125))).toBeCloseTo(0.6, 5)
  }
  expect(board.outline?.filter((point) => point.x === -12)).toEqual([
    { x: -12, y: -9.925 },
    { x: -12, y: 9.925 },
  ])
})
