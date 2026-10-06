import { expect } from "bun:test"
import * as THREE from "three"

export const footprinterRegistrationCases = [
  { footprint: "soic8" },
  { footprint: "0402" },
  { footprint: "fpc12" },
  { footprint: "hexbolt_m3_l8mm", z: [-8, 2] },
  { footprint: "hexsocketbolt_m3_l6mm", z: [-6, 3] },
  { footprint: "sheetmetal_plate_w24mm_l20mm_t1mm", z: [-0.5, 0.5] },
  { footprint: "nema17_l39mm", z: [-42, 24] },
  {
    footprint: "helicalgear24_m1mm_w5mm_ha20deg_left_bore3mm",
    z: [0, 5],
  },
  { footprint: "spurgear24_m1mm_w5mm_bore3mm", z: [0, 5] },
  { footprint: "wormgear_m1mm_d10mm_l10mm_starts2_left_bore3mm", z: [0, 10] },
  {
    footprint: "flexscreen30_w16_h10_flex10_p0.5mm_tail2mm_taper3mm_sitsflat",
    z: [-0.01, 1.61],
  },
] satisfies { footprint: string; z?: [number, number] }[]

export function assertFootprinterMeshBuffers(
  objects: readonly THREE.Object3D[],
  expectedZ?: readonly [number, number],
) {
  expect(objects.length).toBeGreaterThan(0)
  let minimumZ = Number.POSITIVE_INFINITY
  let maximumZ = Number.NEGATIVE_INFINITY
  for (const object of objects) {
    if (!(object instanceof THREE.Mesh))
      throw new Error("Expected the viewer to create a Three mesh")
    const geometry = object.geometry as THREE.BufferGeometry
    const positions = geometry.getAttribute("position")
    const normals = geometry.getAttribute("normal")
    const colors = geometry.getAttribute("color")
    expect(positions.count).toBeGreaterThan(0)
    expect(normals.count).toBe(positions.count)
    expect(colors.count).toBe(positions.count)
    for (const attribute of [positions, normals, colors]) {
      expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true)
    }
    expect(geometry.getIndex()!.count).toBeGreaterThan(0)
    expect(geometry.getIndex()!.count % 3).toBe(0)
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.isEmpty()).toBe(false)
    minimumZ = Math.min(minimumZ, geometry.boundingBox!.min.z)
    maximumZ = Math.max(maximumZ, geometry.boundingBox!.max.z)
    const material = object.material as THREE.MeshStandardMaterial
    expect(material.vertexColors).toBe(true)
  }
  if (expectedZ) {
    expect(minimumZ).toBeCloseTo(expectedZ[0], 5)
    expect(maximumZ).toBeCloseTo(expectedZ[1], 5)
  }
}
