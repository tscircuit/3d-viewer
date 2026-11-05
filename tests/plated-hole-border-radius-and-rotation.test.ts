import { expect, test } from "bun:test"
import { measureBoundingBox } from "@jscad/modeling/src/measurements"
import type { AnyCircuitElement, PcbPlatedHole } from "circuit-json"
import ManifoldModule from "manifold-3d"
import { platedHole } from "../src/geoms/plated-hole"
import { processPlatedHolesForManifold } from "../src/utils/manifold/process-plated-holes"

const ctx = {
  pcbThickness: 1.6,
}

test("clamps full rect_border_radius on rect-pad plated holes in JSCAD and Manifold without throwing", async () => {
  const holes: PcbPlatedHole[] = [
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph_circ_rect",
      shape: "circular_hole_with_rect_pad",
      hole_shape: "circle",
      pad_shape: "rect",
      x: -4,
      y: 0,
      hole_diameter: 0.8,
      hole_offset_x: 0,
      hole_offset_y: 0,
      rect_pad_width: 2,
      rect_pad_height: 2,
      rect_border_radius: 1,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph_pill_rect",
      shape: "pill_hole_with_rect_pad",
      hole_shape: "pill",
      pad_shape: "rect",
      x: 0,
      y: 0,
      hole_width: 1,
      hole_height: 0.6,
      hole_offset_x: 0,
      hole_offset_y: 0,
      rect_pad_width: 2.4,
      rect_pad_height: 1.6,
      rect_border_radius: 0.8,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph_rot_pill_rect",
      shape: "rotated_pill_hole_with_rect_pad",
      hole_shape: "rotated_pill",
      pad_shape: "rect",
      x: 4,
      y: 0,
      hole_width: 1,
      hole_height: 0.6,
      hole_ccw_rotation: 30,
      hole_offset_x: 0,
      hole_offset_y: 0,
      rect_pad_width: 2.4,
      rect_pad_height: 1.6,
      rect_border_radius: 0.8,
      rect_ccw_rotation: 30,
      layers: ["top", "bottom"],
    },
  ]

  for (const hole of holes) {
    const geom = platedHole(hole, ctx as any)
    const [min, max] = measureBoundingBox(geom)
    expect(max[0] - min[0]).toBeGreaterThan(1)
    expect(max[1] - min[1]).toBeGreaterThan(1)
  }

  const manifold = await ManifoldModule()
  manifold.setup()
  const cleanup: { delete(): void }[] = []
  try {
    const result = processPlatedHolesForManifold(
      manifold.Manifold,
      manifold.CrossSection,
      holes as AnyCircuitElement[],
      1.6,
      cleanup,
    )
    expect(result.platedHoleCopperGeoms).toHaveLength(3)
    for (const { geometry } of result.platedHoleCopperGeoms) {
      geometry.computeBoundingBox()
      expect(geometry.boundingBox).not.toBeNull()
      geometry.dispose()
    }
  } finally {
    for (const item of new Set(cleanup)) item.delete()
  }
})

test("applies rect_ccw_rotation and oval ccw_rotation in JSCAD and Manifold", async () => {
  const holes: PcbPlatedHole[] = [
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph_circ_rot90",
      shape: "circular_hole_with_rect_pad",
      hole_shape: "circle",
      pad_shape: "rect",
      x: 0,
      y: 0,
      hole_diameter: 0.8,
      hole_offset_x: 0,
      hole_offset_y: 0,
      rect_pad_width: 4,
      rect_pad_height: 1.5,
      rect_ccw_rotation: 90,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph_pill_rot90",
      shape: "pill_hole_with_rect_pad",
      hole_shape: "pill",
      pad_shape: "rect",
      x: 5,
      y: 0,
      hole_width: 0.8,
      hole_height: 1.2,
      hole_offset_x: 0,
      hole_offset_y: 0,
      rect_pad_width: 4,
      rect_pad_height: 1.5,
      rect_ccw_rotation: 90,
      layers: ["top", "bottom"],
    } as PcbPlatedHole,
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph_oval_rot90",
      shape: "oval",
      x: 10,
      y: 0,
      outer_width: 4,
      outer_height: 1.5,
      hole_width: 2,
      hole_height: 0.8,
      ccw_rotation: 90,
      layers: ["top", "bottom"],
    },
  ]

  for (const hole of holes) {
    const geom = platedHole(hole, ctx as any)
    const [min, max] = measureBoundingBox(geom)
    expect(max[0] - min[0]).toBeCloseTo(1.5, 1)
    expect(max[1] - min[1]).toBeCloseTo(4, 1)
  }

  const manifold = await ManifoldModule()
  manifold.setup()
  const cleanup: { delete(): void }[] = []
  try {
    const result = processPlatedHolesForManifold(
      manifold.Manifold,
      manifold.CrossSection,
      holes as AnyCircuitElement[],
      1.6,
      cleanup,
    )
    expect(result.platedHoleCopperGeoms).toHaveLength(3)
    for (const { geometry } of result.platedHoleCopperGeoms) {
      geometry.computeBoundingBox()
      const box = geometry.boundingBox!
      expect(box.max.x - box.min.x).toBeCloseTo(1.5, 1)
      expect(box.max.y - box.min.y).toBeCloseTo(4, 1)
      geometry.dispose()
    }
  } finally {
    for (const item of new Set(cleanup)) item.delete()
  }
})
