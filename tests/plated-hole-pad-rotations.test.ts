import { expect, test } from "bun:test"
import { measureBoundingBox } from "@jscad/modeling/src/measurements"
import type { AnyCircuitElement, PcbPlatedHole } from "circuit-json"
import ManifoldModule from "manifold-3d"
import * as THREE from "three"
import { platedHole } from "../src/geoms/plated-hole"
import { processPlatedHolesForManifold } from "../src/utils/manifold/process-plated-holes"

const ctx = { pcbThickness: 1.6 }

const rotatedPlatedHoles: PcbPlatedHole[] = [
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "ph-circle-rect-90",
    shape: "circular_hole_with_rect_pad",
    hole_shape: "circle",
    pad_shape: "rect",
    x: 2,
    y: -1,
    hole_offset_x: 0,
    hole_offset_y: 0,
    hole_diameter: 0.8,
    rect_pad_width: 4,
    rect_pad_height: 1.6,
    rect_ccw_rotation: 90,
    layers: ["top", "bottom"],
  } as PcbPlatedHole,
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "ph-pill-rect-90",
    shape: "pill_hole_with_rect_pad",
    hole_shape: "pill",
    pad_shape: "rect",
    x: -2,
    y: 1.5,
    hole_offset_x: 0,
    hole_offset_y: 0,
    hole_width: 1.2,
    hole_height: 0.6,
    rect_pad_width: 4,
    rect_pad_height: 1.6,
    rect_ccw_rotation: 90,
    layers: ["top", "bottom"],
  } as unknown as PcbPlatedHole,
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "ph-oval-90",
    shape: "oval",
    x: 1,
    y: 2,
    hole_width: 2,
    hole_height: 0.8,
    outer_width: 4,
    outer_height: 1.6,
    ccw_rotation: 90,
    layers: ["top", "bottom"],
  } as PcbPlatedHole,
]

test("JSCAD applies pad rotations for circular_hole_with_rect_pad, pill_hole_with_rect_pad, and oval", () => {
  for (const ph of rotatedPlatedHoles) {
    const geom = platedHole(ph, ctx)
    const [min, max] = measureBoundingBox(geom)
    const widthX = max[0] - min[0]
    const heightY = max[1] - min[1]

    expect(widthX).toBeCloseTo(1.6, 1)
    expect(heightY).toBeCloseTo(4, 1)
    expect((min[0] + max[0]) / 2).toBeCloseTo(ph.x, 1)
    expect((min[1] + max[1]) / 2).toBeCloseTo(ph.y, 1)
  }
})

test("Manifold applies pad rotations for circular_hole_with_rect_pad, pill_hole_with_rect_pad, and oval", async () => {
  const module = await ManifoldModule()
  module.setup()
  const { Manifold, CrossSection } = module
  const cleanup: any[] = []

  try {
    const { platedHoleCopperGeoms } = processPlatedHolesForManifold(
      Manifold,
      CrossSection,
      rotatedPlatedHoles as AnyCircuitElement[],
      1.6,
      cleanup,
    )

    expect(platedHoleCopperGeoms).toHaveLength(rotatedPlatedHoles.length)

    for (const [index, ph] of rotatedPlatedHoles.entries()) {
      const geomEntry = platedHoleCopperGeoms[index]!
      geomEntry.geometry.computeBoundingBox()
      const box = geomEntry.geometry.boundingBox!
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())

      expect(size.x).toBeCloseTo(1.6, 1)
      expect(size.y).toBeCloseTo(4, 1)
      expect(center.x).toBeCloseTo(ph.x, 1)
      expect(center.y).toBeCloseTo(ph.y, 1)

      geomEntry.geometry.dispose()
    }
  } finally {
    for (const op of new Set(cleanup)) {
      if (op && typeof op.delete === "function") {
        try {
          op.delete()
        } catch {}
      }
    }
  }
})
