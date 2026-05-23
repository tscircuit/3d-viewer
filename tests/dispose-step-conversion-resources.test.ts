import { expect, test } from "bun:test"
import * as THREE from "three"
import { disposeStepConversionResources } from "../src/utils/dispose-step-conversion-resources"

test("disposes mesh geometry and material resources in a group", () => {
  const group = new THREE.Group()
  const geometry = new THREE.BoxGeometry()
  const material = new THREE.MeshBasicMaterial()
  let geometryDisposeCount = 0
  let materialDisposeCount = 0

  geometry.dispose = () => {
    geometryDisposeCount += 1
  }
  material.dispose = () => {
    materialDisposeCount += 1
  }

  group.add(new THREE.Object3D())
  group.add(new THREE.Mesh(geometry, material))

  disposeStepConversionResources(group)

  expect(geometryDisposeCount).toBe(1)
  expect(materialDisposeCount).toBe(1)
})

test("disposes every material in mesh material arrays", () => {
  const group = new THREE.Group()
  const geometry = new THREE.BoxGeometry()
  const firstMaterial = new THREE.MeshBasicMaterial()
  const secondMaterial = new THREE.MeshBasicMaterial()
  const materialDisposeCounts = [0, 0]
  let geometryDisposeCount = 0

  geometry.dispose = () => {
    geometryDisposeCount += 1
  }
  firstMaterial.dispose = () => {
    materialDisposeCounts[0] += 1
  }
  secondMaterial.dispose = () => {
    materialDisposeCounts[1] += 1
  }

  group.add(new THREE.Mesh(geometry, [firstMaterial, secondMaterial]))

  disposeStepConversionResources(group)

  expect(geometryDisposeCount).toBe(1)
  expect(materialDisposeCounts).toEqual([1, 1])
})
