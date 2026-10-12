import { expect, test } from "bun:test"
import { intersect } from "@jscad/modeling/src/operations/booleans"
import { cuboid } from "@jscad/modeling/src/primitives"
import { measureVolume } from "@jscad/modeling/src/measurements"
import type { AnyCircuitElement } from "circuit-json"
import ManifoldModule from "manifold-3d"
import * as THREE from "three"
import { BoardGeomBuilder } from "../src/BoardGeomBuilder"
import { processViasForManifold } from "../src/utils/manifold/process-vias"
import { processNonPlatedHolesForManifold } from "../src/utils/manifold/process-non-plated-holes"
import { processPlatedHolesForManifold } from "../src/utils/manifold/process-plated-holes"

const board = {
  type: "pcb_board",
  pcb_board_id: "board",
  center: { x: 0, y: 0 },
  width: 10,
  height: 10,
  thickness: 1.6,
  num_layers: 2,
  material: "fr4",
} as const
const pad = {
  type: "pcb_plated_hole",
  pcb_plated_hole_id: "pad",
  pcb_component_id: "component",
  shape: "circular_hole_with_rect_pad",
  hole_shape: "circle",
  pad_shape: "rect",
  x: 0,
  y: 0,
  hole_diameter: 0.5,
  rect_pad_width: 4,
  rect_pad_height: 3,
  layers: ["top", "bottom"],
} as const
const opening = {
  type: "pcb_plated_hole",
  pcb_plated_hole_id: "opening",
  pcb_component_id: "component",
  shape: "circle",
  x: 2,
  y: 0,
  hole_diameter: 1,
  outer_diameter: 1.4,
  layers: ["top", "bottom"],
} as const
const via = {
  type: "pcb_via",
  pcb_via_id: "via",
  x: 2,
  y: 0,
  hole_diameter: 1,
  outer_diameter: 1.4,
  layers: ["top", "bottom"],
} as const

for (const foreignHole of [opening, via]) {
  for (const reverse of [false, true]) {
    test(`JSCAD drills neighboring pad copper for ${foreignHole.type}, reverse=${reverse}`, () => {
      const holes = reverse ? [foreignHole, pad] : [pad, foreignHole]
      const builder = new BoardGeomBuilder(
        [board, ...holes] as AnyCircuitElement[],
        () => {},
      )
      while (!builder.step(100)) {}
      const copper = builder.getGeoms().slice(1)
      // This probe crosses the pad boundary inside the foreign hole. The old
      // pad fill occupied it, making a solid vertical wall through the opening.
      const probe = cuboid({ center: [1.8, 0, 0], size: [0.1, 0.1, 1] })
      for (const geom of copper) {
        expect(Math.abs(measureVolume(intersect(geom, probe)))).toBeLessThan(
          1e-8,
        )
      }
      // An ordinary pad section and the foreign hole's barrel still exist.
      expect(
        measureVolume(
          intersect(
            copper[foreignHole.type === "pcb_via" ? 0 : holes.indexOf(pad)]!,
            cuboid({ center: [1, 0, 0], size: [0.1, 0.1, 1] }),
          ),
        ),
      ).toBeGreaterThan(0.009)
      expect(copper.every((geom) => measureVolume(geom) > 0)).toBe(true)
    })
  }
}

for (const holeType of ["pcb_hole", "pcb_plated_hole", "pcb_via"] as const) {
  test(`Manifold removes only the via barrel inside an overlapping ${holeType}`, async () => {
    const module = await ManifoldModule()
    module.setup()
    const { Manifold, CrossSection } = module
    const cleanup: any[] = []
    const foreignHole =
      holeType === "pcb_hole"
        ? {
            type: holeType,
            pcb_hole_id: "hole",
            x: 1.5,
            y: 0,
            hole_shape: "circle",
            hole_diameter: 1.2,
          }
        : holeType === "pcb_plated_hole"
          ? { ...opening, x: 1.5, hole_diameter: 1.2, outer_diameter: 1.6 }
          : {
              ...via,
              pcb_via_id: "other-via",
              x: 1.5,
              hole_diameter: 1.2,
              outer_diameter: 1.6,
            }
    const circuit = [board, via, foreignHole] as AnyCircuitElement[]
    try {
      const { nonPlatedHoleBoardDrills } = processNonPlatedHolesForManifold(
        Manifold,
        CrossSection,
        circuit,
        1.6,
        cleanup,
      )
      const { platedHoleBoardDrills } = processPlatedHolesForManifold(
        Manifold,
        CrossSection,
        circuit,
        1.6,
        cleanup,
      )
      const { viaCopperGeoms } = processViasForManifold(
        Manifold,
        circuit,
        1.6,
        cleanup,
        undefined,
        [...nonPlatedHoleBoardDrills, ...platedHoleBoardDrills],
      )
      const geometry = viaCopperGeoms.find(
        (geom) => geom.key === "via-via",
      )!.geometry
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
      )
      const ray = (x: number) =>
        new THREE.Raycaster(
          new THREE.Vector3(x, 0, 3),
          new THREE.Vector3(0, 0, -1),
        ).intersectObject(mesh)
      // Left barrel is inside the foreign drill; the right barrel is outside it.
      expect(ray(1.4995)).toHaveLength(0)
      expect(ray(2.5005).length).toBeGreaterThan(0)
      for (const geom of viaCopperGeoms) geom.geometry.dispose()
      mesh.material.dispose()
    } finally {
      for (const op of new Set(cleanup)) op.delete()
    }
  })
}
