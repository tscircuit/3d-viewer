import * as THREE from "three"
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

type CameraControls = Pick<OrbitControls, "target"> & {
  update: () => unknown
}

type StoredCameraSession = {
  position: number[]
  quaternion: number[]
  up: number[]
  fov: number
  target: number[]
}

const CAMERA_SESSION_STORAGE_KEY = "cadViewerCameraStateSession"

function getCameraSessionStorageKey(cameraSessionScope?: string): string {
  if (!cameraSessionScope) return CAMERA_SESSION_STORAGE_KEY
  return `${CAMERA_SESSION_STORAGE_KEY}:${cameraSessionScope}`
}

export function saveCameraSession({
  camera,
  controls,
  cameraSessionScope,
}: {
  camera: THREE.Camera
  controls: CameraControls
  cameraSessionScope?: string
}): void {
  try {
    const storedCameraSession: StoredCameraSession = {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      up: camera.up.toArray(),
      fov: camera instanceof THREE.PerspectiveCamera ? camera.fov : 50,
      target: controls.target.toArray(),
    }
    sessionStorage.setItem(
      getCameraSessionStorageKey(cameraSessionScope),
      JSON.stringify(storedCameraSession),
    )
  } catch (error) {
    console.warn("Failed to save camera:", error)
  }
}

export function loadCameraSession({
  camera,
  controls,
  cameraSessionScope,
}: {
  camera: THREE.Camera
  controls: CameraControls
  cameraSessionScope?: string
}): boolean {
  try {
    const storedCameraSessionJson = sessionStorage.getItem(
      getCameraSessionStorageKey(cameraSessionScope),
    )
    if (!storedCameraSessionJson) return false

    const storedCameraSession: StoredCameraSession = JSON.parse(
      storedCameraSessionJson,
    )
    camera.position.fromArray(storedCameraSession.position)
    camera.quaternion.fromArray(storedCameraSession.quaternion)
    camera.up.fromArray(storedCameraSession.up)

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = storedCameraSession.fov
      camera.updateProjectionMatrix()
    }

    controls.target.fromArray(storedCameraSession.target)
    controls.update()
    camera.updateMatrixWorld()

    return true
  } catch (error) {
    console.warn("Failed to restore camera:", error)
    return false
  }
}
