import * as THREE from "three"

const CAMERA_KEY = "cadViewerCameraStateSession"

type OrbitControlsLike = {
  target: THREE.Vector3
  update: () => void
}

export const saveCameraToSession = (
  camera: THREE.Camera,
  controls: OrbitControlsLike,
) => {
  try {
    const data = {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      up: camera.up.toArray(),
      fov: (camera as THREE.PerspectiveCamera).fov ?? 50,
      target: controls.target.toArray(),
    }

    sessionStorage.setItem(CAMERA_KEY, JSON.stringify(data))
  } catch (error) {
    console.warn("Failed to save camera:", error)
  }
}

export const loadCameraFromSession = (
  camera: THREE.Camera,
  controls: OrbitControlsLike,
): boolean => {
  try {
    const raw = sessionStorage.getItem(CAMERA_KEY)
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
