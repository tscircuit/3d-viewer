import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import { geom3 } from "@jscad/modeling/src/geometries"
import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import ManifoldModule from "manifold-3d"
import * as THREE from "three"
import { createViaCopper as createJscadVia } from "../src/geoms/via-geoms"
import {
  applyCopperMaskUvs,
  createMaskedCopperMaterial,
} from "../src/utils/create-masked-copper-material"
import { createGeometryFromPolygons } from "../src/utils/create-geometry-from-polygons"
import { manifoldMeshToThreeGeometry } from "../src/utils/manifold-mesh-to-three-geometry"
import { createViaCopper as createManifoldVia } from "../src/utils/via-geoms"

for (const engine of ["jscad", "manifold"] as const) {
  test(`${engine}: bore stays gold while the outer wall and rim retain soldermask`, async () => {
    const previousDocument = globalThis.document
    Object.assign(globalThis, {
      document: { createElement: () => createCanvas(1, 1) },
    })
    const board: PcbBoard = {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 6,
      height: 4,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    }
    const via = {
      type: "pcb_via",
      pcb_via_id: "via",
      x: 1,
      y: 0,
      hole_diameter: 1,
      outer_diameter: 1.4,
      layers: ["top", "bottom"],
      tented_on_top: true,
      tented_on_bottom: true,
    }
    const circuit = [
      board,
      {
        type: "pcb_smtpad",
        pcb_smtpad_id: "pad",
        pcb_component_id: "component",
        shape: "rect",
        x: 0,
        y: 0,
        width: 2,
        height: 3,
        layer: "top",
      },
      via,
    ] as AnyCircuitElement[]
    let op: any
    try {
      const coating = createMaskedCopperMaterial({
        circuitJson: circuit,
        boardData: board,
        visibility: { topMask: true, bottomMask: true },
      })
      const options = {
        x: 1,
        y: 0,
        holeDiameter: 1,
        outerDiameter: 1.4,
        thickness: 1.6,
      }
      let geometry: THREE.BufferGeometry
      if (engine === "jscad") {
        geometry = createGeometryFromPolygons(
          geom3.toPolygons(createJscadVia(options)),
        )
      } else {
        const module = await ManifoldModule()
        module.setup()
        op = createManifoldVia({ ...options, Manifold: module.Manifold })
        geometry = manifoldMeshToThreeGeometry(op.getMesh())
      }
      applyCopperMaskUvs(geometry, coating.material)
      const mesh = new THREE.Mesh(geometry, coating.material)
      const hit = (
        origin: [number, number, number],
        direction: [number, number, number],
      ) => {
        const intersections = new THREE.Raycaster(
          new THREE.Vector3(...origin),
          new THREE.Vector3(...direction),
        ).intersectObject(mesh)
        expect(intersections.length).toBeGreaterThan(0)
        return intersections[0]!
      }
      // Rays from the bore hit its actual inner wall, on both board halves and
      // all four sides, including the side outside the exposed pad.
      for (const z of [-0.4, 0.4])
        for (const direction of [
          [1, 0, 0],
          [-1, 0, 0],
          [0, 1, 0],
          [0, -1, 0],
        ] as [number, number, number][]) {
          expect(hit([1, 0, z], direction).uv!.x).toBe(-1)
        }
      // The outside wall and top rim still sample the green mask atlas.
      expect(hit([2, 0, 0.4], [-1, 0, 0]).uv!.x).toBeGreaterThan(0)
      expect(hit([1.5005, 0, 2], [0, 0, -1]).uv!.x).toBeGreaterThan(0)
      geometry.dispose()
      coating.dispose()
    } finally {
      op?.delete()
      Object.assign(globalThis, { document: previousDocument })
    }
  })
}
