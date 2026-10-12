import { expect, test } from "bun:test"
import { geom3 } from "@jscad/modeling/src/geometries"
import ManifoldModule from "manifold-3d"
import * as THREE from "three"
import { colors } from "../src/geoms/constants"
import { createViaCopper as createJscadVia } from "../src/geoms/via-geoms"
import { createGeometryFromPolygons } from "../src/utils/create-geometry-from-polygons"
import { manifoldMeshToThreeGeometry } from "../src/utils/manifold-mesh-to-three-geometry"
import { createGeometryMeshes } from "../src/utils/manifold/create-three-geometry-meshes"
import { createViaCopper as createManifoldVia } from "../src/utils/via-geoms"

for (const engine of ["jscad", "manifold"] as const) {
  test(`${engine}: the full bore has gold walls without a custom shader or retessellation`, async () => {
    const options = {
      x: 1,
      y: 0,
      holeDiameter: 1,
      outerDiameter: 1.4,
      thickness: 1.6,
    }
    let op: any
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
    try {
      const vertexCount = geometry.getAttribute("position").count
      const gold = new THREE.Color(...colors.copper)
      const mesh = createGeometryMeshes({
        vias: [{ key: "via", geometry, color: gold }],
      })[0]!
      const material = mesh.material as THREE.MeshStandardMaterial
      expect(material.color.equals(gold)).toBe(true)
      expect(material.onBeforeCompile).toBe(
        THREE.Material.prototype.onBeforeCompile,
      )
      expect(geometry.getAttribute("position").count).toBe(vertexCount)
      for (const z of [-0.4, 0.4])
        for (const direction of [
          [1, 0, 0],
          [-1, 0, 0],
          [0, 1, 0],
          [0, -1, 0],
        ] as [number, number, number][]) {
          const hits = new THREE.Raycaster(
            new THREE.Vector3(1, 0, z),
            new THREE.Vector3(...direction),
          ).intersectObject(mesh)
          expect(hits.length).toBeGreaterThan(0)
          expect(hits[0]!.distance).toBeCloseTo(0.5, 4)
        }
      material.dispose()
    } finally {
      geometry.dispose()
      op?.delete()
    }
  })
}
