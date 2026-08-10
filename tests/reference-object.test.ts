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
  REFERENCE_OBJECT_MENU_OPTIONS,
  REFERENCE_OBJECT_OPTIONS,
  REFERENCE_OBJECT_SPECS,
  toggleReferenceObject,
} from "../src/reference-objects/reference-object"

describe("reference object placement", () => {
  const boardDimensions = { width: 50, height: 40 }
  const boardCenter = { x: 12, y: -8 }

  test("exposes the requested context menu choices", () => {
    expect(REFERENCE_OBJECT_MENU_OPTIONS.map(({ label }) => label)).toEqual([
      "None",
      "Show Banana",
      "Show Credit Card",
      "Show 14in Macbook",
    ])
  })

  test("toggles the selected reference object", () => {
    expect(toggleReferenceObject(null, "banana")).toBe("banana")
    expect(toggleReferenceObject("banana", "banana")).toBeNull()
    expect(toggleReferenceObject("banana", "credit-card")).toBe("credit-card")
    expect(toggleReferenceObject("banana", null)).toBeNull()
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

  test("normalizes the banana mesh to its medium-banana envelope", () => {
    const banana = createReferenceObject("banana")
    banana.updateMatrixWorld(true)
    const size = new THREE.Box3()
      .setFromObject(banana)
      .getSize(new THREE.Vector3())
    const spec = REFERENCE_OBJECT_SPECS.banana

    expect(size.x).toBeCloseTo(spec.width, 4)
    expect(size.y).toBeCloseTo(spec.height, 4)
    expect(size.z).toBeCloseTo(spec.depth, 4)
    expect(banana.getObjectByName("banana-stem")).toBeTruthy()
    expect(banana.getObjectByName("banana-blossom-tip")).toBeTruthy()

    const peel = banana.getObjectByName("banana-peel") as THREE.Mesh
    const geometry = peel.geometry as THREE.BufferGeometry
    const positions = geometry.getAttribute("position")
    const normals = geometry.getAttribute("normal")
    const indices = geometry.index!

    for (let offset = 0; offset < indices.count; offset += 3) {
      const vertexIndices = [
        indices.getX(offset),
        indices.getX(offset + 1),
        indices.getX(offset + 2),
      ]
      const [a, b, c] = vertexIndices.map((index) =>
        new THREE.Vector3().fromBufferAttribute(positions, index),
      )
      const faceNormal = new THREE.Vector3()
        .crossVectors(b!.clone().sub(a!), c!.clone().sub(a!))
        .normalize()
      const averageVertexNormal = vertexIndices
        .reduce(
          (average, index) =>
            average.add(
              new THREE.Vector3().fromBufferAttribute(normals, index),
            ),
          new THREE.Vector3(),
        )
        .normalize()

      expect(faceNormal.dot(averageVertexNormal)).toBeGreaterThan(0)
    }
    disposeReferenceObject(banana)
  })

  test("uses a physically recessed MacBook lid circle", () => {
    const macbook = createReferenceObject("14in-macbook")
    macbook.updateMatrixWorld(true)
    const lid = macbook.getObjectByName("macbook-lid")!
    const indent = macbook.getObjectByName("macbook-lid-indent")!
    const lidBounds = new THREE.Box3().setFromObject(lid)
    const indentBounds = new THREE.Box3().setFromObject(indent)

    expect(macbook.getObjectByName("macbook-lid-mark")).toBeUndefined()
    expect(indentBounds.max.z).toBeLessThan(lidBounds.max.z - 0.2)
    disposeReferenceObject(macbook)
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
