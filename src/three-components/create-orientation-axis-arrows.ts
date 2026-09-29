import * as THREE from "three"

export type OrientationAxis = "x" | "y" | "z"

export const ORIENTATION_AXIS_ARROW_LENGTH = 0.95
export const ORIENTATION_AXIS_LABEL_DISTANCE = 1.12
const AXIS_HEAD_LENGTH = 0.2
const AXIS_HEAD_WIDTH = 0.11

export const ORIENTATION_AXIS_ARROWS = [
  {
    axis: "x" as const,
    color: 0xee3333,
    direction: [1, 0, 0] as const,
  },
  {
    axis: "y" as const,
    color: 0x33aa33,
    direction: [0, 1, 0] as const,
  },
  {
    axis: "z" as const,
    color: 0x3377ee,
    direction: [0, 0, 1] as const,
  },
]

export function createOrientationAxisArrows(
  origin: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
  length = ORIENTATION_AXIS_ARROW_LENGTH,
): THREE.ArrowHelper[] {
  return ORIENTATION_AXIS_ARROWS.map(({ axis, color, direction }) => {
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(...direction),
      origin.clone(),
      length,
      color,
      AXIS_HEAD_LENGTH,
      AXIS_HEAD_WIDTH,
    )
    arrow.userData.kind = "orientation-axis-arrow"
    arrow.userData.axis = axis
    arrow.userData.length = length
    return arrow
  })
}

export function attachOrientationAxisArrows(
  parent: THREE.Object3D,
  origin?: THREE.Vector3,
  length?: number,
): THREE.ArrowHelper[] {
  const arrows = createOrientationAxisArrows(origin, length)
  for (const arrow of arrows) {
    parent.add(arrow)
  }
  return arrows
}

export function getOrientationAxisLabelPose(axis: OrientationAxis) {
  const spec = ORIENTATION_AXIS_ARROWS.find((item) => item.axis === axis)!
  return {
    text: axis.toUpperCase(),
    color: spec.color,
    position: spec.direction.map(
      (component) => component * ORIENTATION_AXIS_LABEL_DISTANCE,
    ) as [number, number, number],
  }
}

export function disposeOrientationAxisArrows(arrows: THREE.ArrowHelper[]) {
  for (const arrow of arrows) {
    arrow.removeFromParent()
    arrow.line.geometry.dispose()
    ;(arrow.line.material as THREE.Material).dispose()
    arrow.cone.geometry.dispose()
    ;(arrow.cone.material as THREE.Material).dispose()
  }
}
