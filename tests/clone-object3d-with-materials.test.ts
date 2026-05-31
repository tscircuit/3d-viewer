import { expect, test } from "bun:test"
import * as THREE from "three"
import { cloneObject3DWithMaterials } from "../src/utils/clone-object3d-with-materials"

function getFirstMaterial(object: THREE.Object3D): THREE.Material {
  let material: THREE.Material | undefined

  object.traverse((child) => {
    if (material || !(child instanceof THREE.Mesh)) return

    material = Array.isArray(child.material)
      ? child.material[0]
      : child.material
  })

  if (!material) {
    throw new Error("Expected mesh material")
  }

  return material
}

test("clones meshes with independent material instances", () => {
  const sourceMaterial = new THREE.MeshStandardMaterial({ opacity: 1 })
  const source = new THREE.Group()
  source.add(new THREE.Mesh(new THREE.BoxGeometry(), sourceMaterial))

  const cloneA = cloneObject3DWithMaterials(source)
  const cloneB = cloneObject3DWithMaterials(source)
  const materialA = getFirstMaterial(cloneA)
  const materialB = getFirstMaterial(cloneB)

  expect(materialA).not.toBe(sourceMaterial)
  expect(materialB).not.toBe(sourceMaterial)
  expect(materialA).not.toBe(materialB)

  materialA.opacity = 0.25

  expect(materialB.opacity).toBe(1)
  expect(sourceMaterial.opacity).toBe(1)
})
