import { expect, test } from "bun:test"
import * as THREE from "three"
import {
  attachOrientationAxisArrows,
  createOrientationAxisArrows,
  getOrientationAxisLabelPose,
  ORIENTATION_AXIS_ARROW_LENGTH,
} from "../src/three-components/create-orientation-axis-arrows"

const localUp = new THREE.Vector3(0, 1, 0)

const expectWorldAxis = (
  arrow: THREE.ArrowHelper,
  expected: [number, number, number],
) => {
  const dir = localUp.clone().applyQuaternion(arrow.quaternion)
  expect(dir.x).toBeCloseTo(expected[0], 5)
  expect(dir.y).toBeCloseTo(expected[1], 5)
  expect(dir.z).toBeCloseTo(expected[2], 5)
}

const coneColor = (arrow: THREE.ArrowHelper) =>
  (arrow.cone.material as THREE.MeshBasicMaterial).color.getHex()

test("orientation cube axes are red/green/blue arrows along +x/+y/+z", () => {
  const arrows = createOrientationAxisArrows()

  expect(arrows.map((arrow) => arrow.userData.axis)).toEqual(["x", "y", "z"])
  expect(coneColor(arrows[0]!)).toBe(0xee3333)
  expect(coneColor(arrows[1]!)).toBe(0x33aa33)
  expect(coneColor(arrows[2]!)).toBe(0x3377ee)

  expectWorldAxis(arrows[0]!, [1, 0, 0])
  expectWorldAxis(arrows[1]!, [0, 1, 0])
  expectWorldAxis(arrows[2]!, [0, 0, 1])

  for (const arrow of arrows) {
    expect(arrow.userData.kind).toBe("orientation-axis-arrow")
    expect(arrow.userData.length).toBe(ORIENTATION_AXIS_ARROW_LENGTH)
  }

  expect(getOrientationAxisLabelPose("x")).toEqual({
    text: "X",
    color: 0xee3333,
    position: [1.12, 0, 0],
  })
  expect(getOrientationAxisLabelPose("y")).toEqual({
    text: "Y",
    color: 0x33aa33,
    position: [0, 1.12, 0],
  })
  expect(getOrientationAxisLabelPose("z")).toEqual({
    text: "Z",
    color: 0x3377ee,
    position: [0, 0, 1.12],
  })
})

test("axis arrows stay world-aligned when the labeled cube is rotated", () => {
  const scene = new THREE.Scene()
  const cubeGroup = new THREE.Group()
  cubeGroup.rotation.fromArray([Math.PI / 2, 0, 0])
  scene.add(cubeGroup)

  const arrows = attachOrientationAxisArrows(scene)
  scene.updateMatrixWorld(true)

  expect(cubeGroup.children).toHaveLength(0)
  expect(arrows).toHaveLength(3)
  expectWorldAxis(arrows[0]!, [1, 0, 0])
  expectWorldAxis(arrows[1]!, [0, 1, 0])
  expectWorldAxis(arrows[2]!, [0, 0, 1])
})
