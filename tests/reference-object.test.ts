import { describe, expect, test } from "bun:test"
import * as THREE from "three"
import {
  createReferenceObject,
  disposeReferenceObject,
} from "../src/reference-objects/create-reference-object"
import { fitCameraToBounds } from "../src/reference-objects/fit-camera-to-bounds"
import {
  getComparisonBounds,
  getReferenceObjectPosition,
  REFERENCE_OBJECT_CLEARANCE_MM,
  REFERENCE_OBJECT_OPTIONS,
  REFERENCE_OBJECT_SPECS,
} from "../src/reference-objects/reference-object"

describe("reference object placement", () => {
  const boardDimensions = { width: 50, height: 40 }
  const boardCenter = { x: 12, y: -8 }

  test("exposes the requested context menu choices", () => {
    expect(REFERENCE_OBJECT_OPTIONS.map(({ label }) => label)).toEqual([
      "Show Banana",
      "Show Credit Card",
      "Show 14in Macbook",
    ])
  })

  for (const option of REFERENCE_OBJECT_OPTIONS) {
    test(`places the ${option.type} beside the board with clearance`, () => {
      const position = getReferenceObjectPosition(
        option.type,
        boardDimensions,
        boardCenter,
      )
      const boardRight = boardCenter.x + boardDimensions.width / 2
      const referenceLeft = position.x - option.width / 2

      expect(referenceLeft - boardRight).toBe(REFERENCE_OBJECT_CLEARANCE_MM)
      expect(position.y).toBe(boardCenter.y)

      const object = createReferenceObject(option.type)
      object.position.set(position.x, position.y, position.z)
      object.updateMatrixWorld(true)
      const actualBounds = new THREE.Box3().setFromObject(object)
      expect(actualBounds.min.x).toBeGreaterThan(boardRight)
      disposeReferenceObject(object)
    })
  }

  test("uses standard credit-card and 14-inch MacBook dimensions", () => {
    expect(REFERENCE_OBJECT_SPECS["credit-card"]).toMatchObject({
      width: 85.6,
      height: 53.98,
      depth: 0.76,
    })
    expect(REFERENCE_OBJECT_SPECS["14in-macbook"]).toMatchObject({
      width: 312.6,
      height: 221.2,
      depth: 15.5,
    })
  })
})

describe("comparison camera fit", () => {
  const bounds = getComparisonBounds(
    "14in-macbook",
    { width: 50, height: 40 },
    { x: 0, y: 0 },
  )

  test("centers and backs up a perspective camera", () => {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1000)
    camera.position.set(20, -40, 50)
    const controls = {
      target: new THREE.Vector3(),
      update: () => {},
    }
    const result = fitCameraToBounds(camera, controls, bounds)

    expect(controls.target.distanceTo(result.center)).toBeLessThan(0.0001)
    expect(camera.position.distanceTo(result.center)).toBeCloseTo(
      result.distance,
      5,
    )
    expect(result.distance).toBeGreaterThan(result.radius)
  })

  test("zooms an orthographic camera to include the comparison", () => {
    const camera = new THREE.OrthographicCamera(-16, 16, 10, -10, -1000, 1000)
    camera.position.set(20, -40, 50)
    const controls = {
      target: new THREE.Vector3(),
      update: () => {},
    }

    fitCameraToBounds(camera, controls, bounds)

    expect(camera.zoom).toBeGreaterThan(0)
    expect(camera.zoom).toBeLessThan(1)
  })
})
