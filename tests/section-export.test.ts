import { expect, test } from "bun:test"
import * as THREE from "three"
import { createSectionExport } from "../src/sections/section-export"
import { sectionPlane } from "../src/sections/section-geometry"

test("section exports clip both sides, preserve input and support unlit meshes", async () => {
  for (const flipped of [false, true])
    await (() => {
      const root = new THREE.Group()
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(4, 4, 4),
        new THREE.MeshStandardMaterial(),
      )
      mesh.position.set(7, 4, 2)
      mesh.rotation.z = 0.4
      root.add(mesh)
      const original = mesh.geometry
      const spec = { axis: "x" as const, offset: 7, flipped }
      const exported = createSectionExport(root, spec)
      exported.root.updateWorldMatrix(true, true)
      let capCount = 0
      exported.root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        const p = object.geometry.getAttribute("position")
        for (let i = 0; i < p.count; i++) {
          const world = new THREE.Vector3()
            .fromBufferAttribute(p, i)
            .applyMatrix4(object.matrixWorld)
          expect(
            sectionPlane(spec).distanceToPoint(world),
          ).toBeGreaterThanOrEqual(-0.00001)
        }
        if (object.material.map?.isDataTexture) capCount++
      })
      expect(capCount).toBe(1)
      expect(mesh.geometry).toBe(original)
      expect(mesh.children).toHaveLength(0)
      expect(mesh.material.clippingPlanes).toBeNull()
      exported.dispose()
    })()

  await (() => {
    const root = new THREE.Group()
    const geometry = new THREE.BoxGeometry(4, 4, 4)
    geometry.deleteAttribute("normal")
    root.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()))
    const exported = createSectionExport(root, {
      axis: "x",
      offset: 0,
      flipped: false,
    })
    expect(exported.root.children).toHaveLength(1)
    exported.dispose()
  })()
})
