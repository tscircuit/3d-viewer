import * as THREE from "three"
import type { Bounds3d } from "./reference-object"

interface CameraControlsLike {
  target: THREE.Vector3
  update: () => void
}

export interface FitCameraResult {
  center: THREE.Vector3
  radius: number
  distance: number
}

export const fitCameraToBounds = (
  camera: THREE.Camera,
  controls: CameraControlsLike | null,
  bounds: Bounds3d,
  padding = 1.18,
): FitCameraResult => {
  const width = Math.max(bounds.maxX - bounds.minX, 0)
  const height = Math.max(bounds.maxY - bounds.minY, 0)
  const depth = Math.max(bounds.maxZ - bounds.minZ, 0)
  const center = new THREE.Vector3(
    (bounds.minX + bounds.maxX) / 2,
    (bounds.minY + bounds.maxY) / 2,
    (bounds.minZ + bounds.maxZ) / 2,
  )
  const radius = Math.max(Math.hypot(width, height, depth) / 2, 1)
  const previousTarget = controls?.target ?? new THREE.Vector3()
  // A consistent elevated three-quarter angle keeps the real-world X/Y scale
  // legible even if the user selected a reference from a side-on view.
  const direction = new THREE.Vector3(0, -0.75, 0.9).normalize()

  let distance = Math.max(camera.position.distanceTo(previousTarget), 5)

  if (camera instanceof THREE.PerspectiveCamera) {
    const verticalFov = THREE.MathUtils.degToRad(camera.fov)
    const horizontalFov =
      2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect)
    const limitingFov = Math.min(verticalFov, horizontalFov)
    distance = (radius * padding) / Math.sin(limitingFov / 2)
    camera.far = Math.max(camera.far, distance + radius * padding * 3)
    camera.updateProjectionMatrix()
  } else if (camera instanceof THREE.OrthographicCamera) {
    const halfViewWidth = Math.abs(camera.right - camera.left) / 2
    const halfViewHeight = Math.abs(camera.top - camera.bottom) / 2
    camera.zoom = Math.min(
      halfViewWidth / (radius * padding),
      halfViewHeight / (radius * padding),
    )
    distance = Math.max(distance, radius * padding * 2)
    camera.updateProjectionMatrix()
  }

  camera.position.copy(center).addScaledVector(direction, distance)
  camera.lookAt(center)
  camera.updateMatrixWorld()
  if (controls) {
    controls.target.copy(center)
    controls.update()
  }

  return { center, radius, distance }
}

export const getObjectBounds = (
  rootObject: THREE.Object3D,
): Bounds3d | undefined => {
  rootObject.updateMatrixWorld(true)
  const box = new THREE.Box3()
  const meshBox = new THREE.Box3()

  const visit = (object: THREE.Object3D) => {
    if (!object.visible || object.userData?.isFallback) return
    if (object instanceof THREE.Mesh) {
      if (!object.geometry.boundingBox) {
        object.geometry.computeBoundingBox()
      }
      if (
        object.geometry.boundingBox &&
        !object.geometry.boundingBox.isEmpty()
      ) {
        meshBox
          .copy(object.geometry.boundingBox)
          .applyMatrix4(object.matrixWorld)
        box.union(meshBox)
      }
    }
    for (const child of object.children) {
      visit(child)
    }
  }

  visit(rootObject)
  if (box.isEmpty()) return undefined

  return {
    minX: box.min.x,
    maxX: box.max.x,
    minY: box.min.y,
    maxY: box.max.y,
    minZ: box.min.z,
    maxZ: box.max.z,
  }
}
