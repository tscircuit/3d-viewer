import * as THREE from "three"

const CAMERA_KEY = "cadViewerCameraStateSession"

let hasWarnedSessionStorage = false

const getSessionStorage = (): Storage | null => {
  if (typeof window === "undefined") {
    return null
  }

  try {
    return window.sessionStorage
  } catch (error) {
    if (!hasWarnedSessionStorage) {
      console.warn("Session storage is unavailable:", error)
      hasWarnedSessionStorage = true
    }
    return null
  }
}

type OrbitControlsLike = {
  target: THREE.Vector3
  update: () => void
}

export const saveCameraToSession = (
  camera: THREE.Camera,
  controls: OrbitControlsLike,
) => {
  const storage = getSessionStorage()
  if (!storage) return

  try {
    const data = {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      up: camera.up.toArray(),
      fov: (camera as THREE.PerspectiveCamera).fov ?? 50,
      target: controls.target.toArray(),
    }

    storage.setItem(CAMERA_KEY, JSON.stringify(data))
  } catch (error) {
    console.warn("Failed to save camera:", error)
  }
}

export const loadCameraFromSession = (
  camera: THREE.Camera,
  controls: OrbitControlsLike,
): boolean => {
  const storage = getSessionStorage()
  if (!storage) return false

  try {
    const raw = storage.getItem(CAMERA_KEY)
    if (!raw) return false

    const state = JSON.parse(raw)

    camera.position.fromArray(state.position)
    camera.quaternion.fromArray(state.quaternion)
    camera.up.fromArray(state.up)

    if ("fov" in camera) {
      const perspective = camera as THREE.PerspectiveCamera
      perspective.fov = state.fov
      perspective.updateProjectionMatrix?.()
    }

    controls.target.fromArray(state.target)
    controls.update()
    camera.updateMatrixWorld()

    return true
  } catch (error) {
    console.warn("Failed to restore camera:", error)
    return false
  }
}
