import { expect, test } from "bun:test"
import type * as THREE from "three"
import {
  createMixedStlFallbackModel,
  disposeObject3DResources,
} from "../src/three-components/MixedStlModel"

test("disposes mixed STL fallback mesh resources", () => {
  const fallbackModel = createMixedStlFallbackModel()
  let geometryDisposed = false
  let materialDisposed = false

  fallbackModel.geometry.dispose = () => {
    geometryDisposed = true
  }
  ;(fallbackModel.material as THREE.Material).dispose = () => {
    materialDisposed = true
  }

  disposeObject3DResources(fallbackModel)

  expect(geometryDisposed).toBe(true)
  expect(materialDisposed).toBe(true)
})
