import { expect, test } from "bun:test"
import * as THREE from "three"
import { hidePreviewOnlyObjects } from "../src/utils/hide-preview-only-objects"

test("preview-only meshes are hidden during export and restored afterward", () => {
  const root = new THREE.Group()
  const exportedMesh = new THREE.Mesh()
  const previewMesh = new THREE.Mesh()
  previewMesh.userData.previewOnly = true
  root.add(exportedMesh, previewMesh)

  const restore = hidePreviewOnlyObjects(root)

  expect(exportedMesh.visible).toBe(true)
  expect(previewMesh.visible).toBe(false)

  restore()

  expect(exportedMesh.visible).toBe(true)
  expect(previewMesh.visible).toBe(true)
})
