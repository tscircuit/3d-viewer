import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import * as THREE from "three"
import { findViewerTarget } from "../stories/renderer-comparison/viewer-target"

test("target discovery supports omitted position, footprinter, faux boards and explicit load failure", async () => {
  const fixtures = `${import.meta.dir}/fixtures/renderer-parity/policy`
  for (const format of ["gltf", "footprinter"] as const) {
    const seed: AnyCircuitElement[] = await Bun.file(
      `${fixtures}/soic-${format}.circuit.json`,
    ).json()
    const original = structuredClone(seed)
    const root = new THREE.Group()
    const target = new THREE.Group()
    root.add(target)
    let asset = target
    if (format === "gltf") {
      for (let i = 0; i < 4; i++) {
        const child = new THREE.Group()
        asset.add(child)
        asset = child
      }
    }
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 3))
    asset.add(mesh)
    expect(findViewerTarget(root, seed, "cad1")).toBe(target)
    expect(seed).toEqual(original)
    mesh.geometry.dispose()
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]
    for (const material of materials) material.dispose()
  }
  const seed: AnyCircuitElement[] = await Bun.file(
    `${fixtures}/scale-fit.circuit.json`,
  ).json()
  const root = new THREE.Group()
  const target = new THREE.Group()
  target.position.z = 0.7
  root.add(target)
  let asset = target
  for (let i = 0; i < 4; i++) {
    const child = new THREE.Group()
    asset.add(child)
    asset = child
  }
  expect(() => findViewerTarget(root, seed, "cad1")).toThrow(
    "empty stl geometry",
  )
  const invalidGeometry = new THREE.BufferGeometry()
  invalidGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([NaN, 0, 0], 3),
  )
  const invalidMesh = new THREE.Mesh(invalidGeometry)
  asset.add(invalidMesh)
  expect(() => findViewerTarget(root, seed, "cad1")).toThrow(
    "non-finite stl geometry",
  )
  invalidGeometry.dispose()
  const invalidMaterials = Array.isArray(invalidMesh.material)
    ? invalidMesh.material
    : [invalidMesh.material]
  for (const material of invalidMaterials) material.dispose()
  asset.removeFromParent()
  expect(findViewerTarget(root, seed, "cad1")).toBeNull()
})
