import { expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { PcbPlatedHole } from "circuit-json"
import * as THREE from "three"
import { OBJLoader } from "three-stdlib"
import { prepareRealPartAssets } from "../scripts/prepare-real-part-assets"
import { comparisonCases } from "./fixtures/renderer-parity/cases"
import { compileRendererCircuit } from "./fixtures/renderer-parity/compile-circuit"

function apertureRadius(hole: PcbPlatedHole) {
  if ("hole_diameter" in hole && typeof hole.hole_diameter === "number")
    return hole.hole_diameter / 2
  if (hole.shape === "pill" && hole.hole_width === hole.hole_height)
    return hole.hole_width / 2
  throw new Error("Expected the real TO-92 footprint's circular apertures")
}

test("the TSX quarter-turn corrections seat real TO-92 leads in all three holes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "renderer-to92-mounting-"))
  try {
    await prepareRealPartAssets(join(directory, "assets"))
    for (const definition of comparisonCases.filter(
      (entry) => entry.category === "rotation",
    )) {
      const { circuitJson, target } = await compileRendererCircuit(definition)
      if (
        !target.model_obj_url ||
        !target.rotation ||
        !target.model_origin_position
      ) {
        throw new Error(
          "Mounting recipe must specify its source orientation and native datum",
        )
      }
      const board = circuitJson.find((entry) => entry.type === "pcb_board")
      if (!board) throw new Error("Missing physical board")
      const holes = circuitJson.filter(
        (entry) => entry.type === "pcb_plated_hole",
      )
      expect(holes).toHaveLength(3)
      const origin = target.model_origin_position
      const placement = new THREE.Matrix4()
        .compose(
          new THREE.Vector3(
            target.position.x,
            target.position.y,
            target.position.z,
          ),
          new THREE.Quaternion().setFromEuler(
            new THREE.Euler(
              THREE.MathUtils.degToRad(target.rotation.x),
              THREE.MathUtils.degToRad(target.rotation.y),
              THREE.MathUtils.degToRad(target.rotation.z),
              "XYZ",
            ),
          ),
          new THREE.Vector3(1, 1, 1),
        )
        .multiply(
          new THREE.Matrix4().makeTranslation(-origin.x, -origin.y, -origin.z),
        )
      const text = await Bun.file(join(directory, target.model_obj_url)).text()
      const model = new OBJLoader().parse(
        text.replace(/newmtl[\s\S]*?endmtl/g, ""),
      )
      model.updateMatrixWorld(true)
      const bounds = new THREE.Box3()
      const occupied = new Set<string>()
      let belowBoard = 0
      model.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return
        const positions = child.geometry.getAttribute("position")
        for (let index = 0; index < positions.count; index++) {
          const point = new THREE.Vector3()
            .fromBufferAttribute(positions, index)
            .applyMatrix4(child.matrixWorld)
            .applyMatrix4(placement)
          bounds.expandByPoint(point)
          if (point.z >= -board.thickness / 2 - 0.01) continue
          belowBoard++
          const hole = holes.find(
            (candidate) =>
              Math.hypot(point.x - candidate.x, point.y - candidate.y) <=
              apertureRadius(candidate) + 0.01,
          )
          expect(hole).toBeDefined()
          if (hole) occupied.add(hole.pcb_plated_hole_id)
        }
        child.geometry.dispose()
        for (const material of Array.isArray(child.material)
          ? child.material
          : [child.material])
          material.dispose()
      })
      // The native real model has pin ends at -2.5 and body top at 7.3 mm.
      expect(bounds.min.z).toBeCloseTo(-1.8, 4)
      expect(bounds.max.z).toBeCloseTo(8, 4)
      expect(belowBoard).toBeGreaterThan(0)
      expect(occupied.size).toBe(3)
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
