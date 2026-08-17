import { expect, test } from "bun:test"
import * as jscadModeling from "@jscad/modeling"
import Module from "manifold-3d"
import { BoardGeomBuilder } from "src/BoardGeomBuilder"
import { processPlatedHolesForManifold } from "src/utils/manifold/process-plated-holes"
import type { AnyCircuitElement, PcbPlatedHole } from "circuit-json"

const wasm = await Module()
wasm.setup()
const Manifold = wasm.Manifold
const CrossSection = wasm.CrossSection

function buildCircuitJson(
  holes: Array<{
    x: number
    y: number
    hole_diameter: number
    outer_diameter: number
  }>,
): AnyCircuitElement[] {
  return [
    {
      type: "pcb_board",
      pcb_board_id: "board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      thickness: 1.4,
      material: "fr4",
      num_layers: 2,
    },
    ...holes.map((h, i) => ({
      type: "pcb_plated_hole" as const,
      pcb_plated_hole_id: `ph_${i}`,
      shape: "circle" as const,
      layers: ["top" as const, "bottom" as const],
      x: h.x,
      y: h.y,
      hole_diameter: h.hole_diameter,
      outer_diameter: h.outer_diameter,
    })),
  ]
}

function buildJscadPlatedHoles(
  holes: Array<{
    x: number
    y: number
    hole_diameter: number
    outer_diameter: number
  }>,
) {
  const circuitJson = buildCircuitJson(holes)
  const builder = new BoardGeomBuilder(circuitJson, () => {})
  while (!builder.step(10)) {}
  return (builder as any).platedHoleGeoms
}

function buildManifoldPlatedHoles(
  holes: Array<{
    x: number
    y: number
    hole_diameter: number
    outer_diameter: number
  }>,
) {
  const circuitJson = buildCircuitJson(holes)
  const pcbThickness = 1.4
  const clipThickness = pcbThickness + 2
  const clipCube = Manifold.cube([20, 20, clipThickness], true)
  const cleanup = [clipCube]
  const result = processPlatedHolesForManifold(
    Manifold,
    CrossSection,
    circuitJson,
    pcbThickness,
    cleanup,
    clipCube,
  )
  return result.platedHoleCopperGeoms
}

// --- JSCAD Engine Tests ---
test("JSCAD: right edge hole (x=10) clips outer diameter flush at board boundary", () => {
  const geoms = buildJscadPlatedHoles([
    { x: 10, y: 0, hole_diameter: 2, outer_diameter: 5 },
  ])
  const bbox = jscadModeling.measurements.measureBoundingBox(geoms[0])

  expect(bbox[1][0]).toBeCloseTo(10.0, 4) // Max X should be exactly 10.0, not 10.05
  expect(bbox[0][0]).toBeCloseTo(7.5, 4)
  expect(bbox[0][1]).toBeCloseTo(-2.5, 4)
  expect(bbox[1][1]).toBeCloseTo(2.5, 4)
})

test("JSCAD: left edge hole (x=-10) clips outer diameter flush at board boundary", () => {
  const geoms = buildJscadPlatedHoles([
    { x: -10, y: 0, hole_diameter: 1, outer_diameter: 3 },
  ])
  const bbox = jscadModeling.measurements.measureBoundingBox(geoms[0])

  expect(bbox[0][0]).toBeCloseTo(-10.0, 4) // Min X should be exactly -10.0, not -10.05
  expect(bbox[1][0]).toBeCloseTo(-8.5, 4)
  expect(bbox[0][1]).toBeCloseTo(-1.5, 4)
  expect(bbox[1][1]).toBeCloseTo(1.5, 4)
})

test("JSCAD: top edge hole (y=10) clips outer diameter flush at board boundary", () => {
  const geoms = buildJscadPlatedHoles([
    { x: 0, y: 10, hole_diameter: 2, outer_diameter: 3 },
  ])
  const bbox = jscadModeling.measurements.measureBoundingBox(geoms[0])

  expect(bbox[1][1]).toBeCloseTo(10.0, 4) // Max Y should be exactly 10.0, not 10.05
  expect(bbox[0][1]).toBeCloseTo(8.5, 4)
  expect(bbox[0][0]).toBeCloseTo(-1.5, 4)
  expect(bbox[1][0]).toBeCloseTo(1.5, 4)
})

test("JSCAD: bottom edge hole (y=-10) clips outer diameter flush at board boundary", () => {
  const geoms = buildJscadPlatedHoles([
    { x: 0, y: -10, hole_diameter: 2, outer_diameter: 3 },
  ])
  const bbox = jscadModeling.measurements.measureBoundingBox(geoms[0])

  expect(bbox[0][1]).toBeCloseTo(-10.0, 4) // Min Y should be exactly -10.0, not -10.05
  expect(bbox[1][1]).toBeCloseTo(-8.5, 4)
  expect(bbox[0][0]).toBeCloseTo(-1.5, 4)
  expect(bbox[1][0]).toBeCloseTo(1.5, 4)
})

test("JSCAD: corner hole (x=10, y=10) clips both X and Y outer boundaries", () => {
  const geoms = buildJscadPlatedHoles([
    { x: 10, y: 10, hole_diameter: 2, outer_diameter: 5 },
  ])
  const bbox = jscadModeling.measurements.measureBoundingBox(geoms[0])

  expect(bbox[1][0]).toBeCloseTo(10.0, 4)
  expect(bbox[1][1]).toBeCloseTo(10.0, 4)
  expect(bbox[0][0]).toBeCloseTo(7.5, 4)
  expect(bbox[0][1]).toBeCloseTo(7.5, 4)
})

test("JSCAD: interior hole (x=0, y=0) is untouched with full circular geometry preserved", () => {
  const geoms = buildJscadPlatedHoles([
    { x: 0, y: 0, hole_diameter: 2, outer_diameter: 4 },
  ])
  const bbox = jscadModeling.measurements.measureBoundingBox(geoms[0])

  expect(bbox[0][0]).toBeCloseTo(-2.0, 4)
  expect(bbox[1][0]).toBeCloseTo(2.0, 4)
  expect(bbox[0][1]).toBeCloseTo(-2.0, 4)
  expect(bbox[1][1]).toBeCloseTo(2.0, 4)
})

// --- Manifold Engine Tests ---
test("Manifold: right edge hole (x=10) clips outer diameter flush at board boundary", () => {
  const geoms = buildManifoldPlatedHoles([
    { x: 10, y: 0, hole_diameter: 2, outer_diameter: 5 },
  ])
  const geom = geoms[0]!.geometry
  geom.computeBoundingBox()

  expect(geom.boundingBox!.max.x).toBeCloseTo(10.0, 4)
  expect(geom.boundingBox!.min.x).toBeCloseTo(7.5, 4)
  expect(geom.boundingBox!.min.y).toBeCloseTo(-2.5, 4)
  expect(geom.boundingBox!.max.y).toBeCloseTo(2.5, 4)
})

test("Manifold: left edge hole (x=-10) clips outer diameter flush at board boundary", () => {
  const geoms = buildManifoldPlatedHoles([
    { x: -10, y: 0, hole_diameter: 1, outer_diameter: 3 },
  ])
  const geom = geoms[0]!.geometry
  geom.computeBoundingBox()

  expect(geom.boundingBox!.min.x).toBeCloseTo(-10.0, 4)
  expect(geom.boundingBox!.max.x).toBeCloseTo(-8.5, 4)
  expect(geom.boundingBox!.min.y).toBeCloseTo(-1.5, 4)
  expect(geom.boundingBox!.max.y).toBeCloseTo(1.5, 4)
})

test("Manifold: top edge hole (y=10) clips outer diameter flush at board boundary", () => {
  const geoms = buildManifoldPlatedHoles([
    { x: 0, y: 10, hole_diameter: 2, outer_diameter: 3 },
  ])
  const geom = geoms[0]!.geometry
  geom.computeBoundingBox()

  expect(geom.boundingBox!.max.y).toBeCloseTo(10.0, 4)
  expect(geom.boundingBox!.min.y).toBeCloseTo(8.5, 4)
  expect(geom.boundingBox!.min.x).toBeCloseTo(-1.5, 4)
  expect(geom.boundingBox!.max.x).toBeCloseTo(1.5, 4)
})

test("Manifold: bottom edge hole (y=-10) clips outer diameter flush at board boundary", () => {
  const geoms = buildManifoldPlatedHoles([
    { x: 0, y: -10, hole_diameter: 2, outer_diameter: 3 },
  ])
  const geom = geoms[0]!.geometry
  geom.computeBoundingBox()

  expect(geom.boundingBox!.min.y).toBeCloseTo(-10.0, 4)
  expect(geom.boundingBox!.max.y).toBeCloseTo(-8.5, 4)
  expect(geom.boundingBox!.min.x).toBeCloseTo(-1.5, 4)
  expect(geom.boundingBox!.max.x).toBeCloseTo(1.5, 4)
})

test("Manifold: corner hole (x=10, y=10) clips both X and Y outer boundaries", () => {
  const geoms = buildManifoldPlatedHoles([
    { x: 10, y: 10, hole_diameter: 2, outer_diameter: 5 },
  ])
  const geom = geoms[0]!.geometry
  geom.computeBoundingBox()

  expect(geom.boundingBox!.max.x).toBeCloseTo(10.0, 4)
  expect(geom.boundingBox!.max.y).toBeCloseTo(10.0, 4)
  expect(geom.boundingBox!.min.x).toBeCloseTo(7.5, 4)
  expect(geom.boundingBox!.min.y).toBeCloseTo(7.5, 4)
})

test("Manifold: interior hole (x=0, y=0) is untouched with full circular geometry preserved", () => {
  const geoms = buildManifoldPlatedHoles([
    { x: 0, y: 0, hole_diameter: 2, outer_diameter: 4 },
  ])
  const geom = geoms[0]!.geometry
  geom.computeBoundingBox()

  expect(geom.boundingBox!.min.x).toBeCloseTo(-2.0, 4)
  expect(geom.boundingBox!.max.x).toBeCloseTo(2.0, 4)
  expect(geom.boundingBox!.min.y).toBeCloseTo(-2.0, 4)
  expect(geom.boundingBox!.max.y).toBeCloseTo(2.0, 4)
})
