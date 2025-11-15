import { useCallback, useRef } from "react"
import type * as THREE from "three"
import {
  loadCameraFromSession,
  saveCameraToSession,
  useCameraController,
} from "../contexts/CameraControllerContext"

export const useCameraSession = () => {
  const { controlsRef } = useCameraController()
  const cameraRef = useRef<THREE.Camera | null>(null)
  const cameraRestoredRef = useRef(false)
  const saveTimeoutRef = useRef<any>(null)

  const handleCameraCreated = useCallback(
    (camera: THREE.Camera) => {
      cameraRef.current = camera
      if (!cameraRestoredRef.current && controlsRef.current) {
        const restored = loadCameraFromSession(camera, controlsRef.current)
        if (restored) {
          cameraRestoredRef.current = true
        }
      }
    },
    [controlsRef],
  )

  const handleControlsChange = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return

    // Attempt one-time restore on first controls change
    if (!cameraRestoredRef.current) {
      const restored = loadCameraFromSession(
        cameraRef.current,
        controlsRef.current,
      )
      if (restored) {
        cameraRestoredRef.current = true
        return
      }
    }

    // Save camera state with debounce
    clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      if (cameraRef.current && controlsRef.current) {
        saveCameraToSession(cameraRef.current, controlsRef.current)
      }
    }, 150)
  }, [controlsRef])

  return {
    handleCameraCreated,
    handleControlsChange,
  }
}
