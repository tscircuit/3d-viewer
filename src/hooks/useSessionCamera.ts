import * as THREE from "three"

const CAMERA_KEY = "cadViewerCameraStateSession"

// ✅ Save camera
export const saveCameraToSession = (camera: THREE.Camera, controls: any) => {
  try {
    const savedCameraSession = {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      up: camera.up.toArray(),
      fov: (camera as any).fov ?? 50,
      target: controls.target.toArray(),
    }
    sessionStorage.setItem(CAMERA_KEY, JSON.stringify(savedCameraSession))
  } catch (err) {
    console.warn("Failed to save camera:", err)
  }
}

// ✅ Load + restore camera
export const loadCameraFromSession = (
  camera: THREE.Camera,
  controls: any,
): boolean => {
  try {
    const raw = sessionStorage.getItem(CAMERA_KEY)
    if (!raw) return false

    const state = JSON.parse(raw)

    camera.position.fromArray(state.position)
    camera.quaternion.fromArray(state.quaternion)
    camera.up.fromArray(state.up)

    if ("fov" in camera) {
      const persp = camera as THREE.PerspectiveCamera
      persp.fov = state.fov
      persp.updateProjectionMatrix?.()
    }

    controls.target.fromArray(state.target)
    controls.update()
    camera.updateMatrixWorld()

    return true
  } catch (err) {
    console.warn("Failed to restore camera:", err)
    return false
  }
}
