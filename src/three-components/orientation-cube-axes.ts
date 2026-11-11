import * as THREE from "three"
import { Text as TroikaText } from "troika-three-text"

export interface OrientationAxisDefinition {
  axis: "x" | "y" | "z"
  label: "X" | "Y" | "Z"
  color: number
  direction: readonly [number, number, number]
}

export const ORIENTATION_AXIS_DEFINITIONS: readonly OrientationAxisDefinition[] =
  [
    { axis: "x", label: "X", color: 0xef4444, direction: [1, 0, 0] },
    { axis: "y", label: "Y", color: 0x22c55e, direction: [0, 1, 0] },
    { axis: "z", label: "Z", color: 0x3b82f6, direction: [0, 0, 1] },
  ]

export interface OrientationCubeAxesHandle {
  group: THREE.Group
  labels: Record<"x" | "y" | "z", TroikaText>
  arrows: Record<"x" | "y" | "z", THREE.Group>
  syncToCamera: (camera: THREE.Camera) => void
  dispose: () => void
}

const ORIGIN_COORD = -0.54
const ARROW_LENGTH = 1.24
const HEAD_LENGTH = 0.24
const HEAD_RADIUS = 0.085
const SHAFT_LENGTH = ARROW_LENGTH - HEAD_LENGTH
const SHAFT_RADIUS = 0.032
const LABEL_OFFSET = 0.16
const LOCAL_UP = new THREE.Vector3(0, 1, 0)

export function createOrientationCubeAxes(): OrientationCubeAxesHandle {
  const rootGroup = new THREE.Group()
  rootGroup.name = "orientation-cube-axes"

  const origin = new THREE.Vector3(ORIGIN_COORD, ORIGIN_COORD, ORIGIN_COORD)

  const originGeometry = new THREE.SphereGeometry(0.045, 12, 12)
  const originMaterial = new THREE.MeshBasicMaterial({ color: 0x334155 })
  const originHub = new THREE.Mesh(originGeometry, originMaterial)
  originHub.name = "orientation-axis-origin"
  originHub.position.copy(origin)
  rootGroup.add(originHub)

  const shaftGeometry = new THREE.CylinderGeometry(
    SHAFT_RADIUS,
    SHAFT_RADIUS,
    SHAFT_LENGTH,
    12,
  )
  const headGeometry = new THREE.ConeGeometry(HEAD_RADIUS, HEAD_LENGTH, 16)

  const materials: THREE.Material[] = [originMaterial]
  const labels = {} as Record<"x" | "y" | "z", TroikaText>
  const arrows = {} as Record<"x" | "y" | "z", THREE.Group>

  for (const def of ORIENTATION_AXIS_DEFINITIONS) {
    const dir = new THREE.Vector3(
      def.direction[0],
      def.direction[1],
      def.direction[2],
    ).normalize()

    const material = new THREE.MeshBasicMaterial({ color: def.color })
    materials.push(material)

    const arrowGroup = new THREE.Group()
    arrowGroup.name = `orientation-axis-arrow-${def.axis}`
    arrowGroup.position.copy(origin)
    arrowGroup.quaternion.setFromUnitVectors(LOCAL_UP, dir)

    const shaftMesh = new THREE.Mesh(shaftGeometry, material)
    shaftMesh.name = `orientation-axis-shaft-${def.axis}`
    shaftMesh.position.set(0, SHAFT_LENGTH / 2, 0)
    arrowGroup.add(shaftMesh)

    const headMesh = new THREE.Mesh(headGeometry, material)
    headMesh.name = `orientation-axis-head-${def.axis}`
    headMesh.position.set(0, SHAFT_LENGTH + HEAD_LENGTH / 2, 0)
    arrowGroup.add(headMesh)

    rootGroup.add(arrowGroup)
    arrows[def.axis] = arrowGroup

    const labelMesh = new TroikaText()
    labelMesh.name = `orientation-axis-label-${def.axis}`
    labelMesh.text = def.label
    labelMesh.color = def.color
    labelMesh.fontSize = 0.24
    labelMesh.anchorX = "center"
    labelMesh.anchorY = "middle"
    labelMesh.depthOffset = -1
    labelMesh.font = null
    labelMesh.position
      .copy(origin)
      .addScaledVector(dir, ARROW_LENGTH + LABEL_OFFSET)
    labelMesh.sync()

    rootGroup.add(labelMesh)
    labels[def.axis] = labelMesh
  }

  return {
    group: rootGroup,
    labels,
    arrows,
    syncToCamera(camera: THREE.Camera) {
      for (const def of ORIENTATION_AXIS_DEFINITIONS) {
        labels[def.axis].quaternion.copy(camera.quaternion)
      }
    },
    dispose() {
      for (const def of ORIENTATION_AXIS_DEFINITIONS) {
        labels[def.axis].dispose()
      }
      originGeometry.dispose()
      shaftGeometry.dispose()
      headGeometry.dispose()
      for (const mat of materials) {
        mat.dispose()
      }
    },
  }
}
