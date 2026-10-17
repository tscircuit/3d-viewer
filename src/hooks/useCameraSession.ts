import { useCallback, useEffect, useRef } from "react"
import type * as THREE from "three"
import {
  loadCameraFromSession,
  saveCameraToSession,
  useCameraController,
} from "../contexts/CameraControllerContext"

const CAMERA_SESSION_NOT_RESTORED = Symbol("camera-session-not-restored")

export const useCameraSession = ({
  cameraSessionScope,
}: {
  cameraSessionScope?: string
} = {}) => {
  const { controlsRef } = useCameraController()
  const cameraRef = useRef<THREE.Camera | null>(null)
  const restoredCameraSessionScopeRef = useRef<
    string | undefined | typeof CAMERA_SESSION_NOT_RESTORED
  >(CAMERA_SESSION_NOT_RESTORED)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current !== null) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
    }
  }, [cameraSessionScope])

  const handleCameraCreated = useCallback(
    (camera: THREE.Camera) => {
      cameraRef.current = camera
      if (
        restoredCameraSessionScopeRef.current !== cameraSessionScope &&
        controlsRef.current
      ) {
        const restored = loadCameraFromSession(camera, {
          controls: controlsRef.current,
          cameraSessionScope,
        })
        restoredCameraSessionScopeRef.current = cameraSessionScope
        if (restored) {
          return
        }
      }
    },
    [cameraSessionScope, controlsRef],
  )

  const handleControlsChange = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return

    // Attempt one-time restore on first controls change
    if (restoredCameraSessionScopeRef.current !== cameraSessionScope) {
      const restored = loadCameraFromSession(cameraRef.current, {
        controls: controlsRef.current,
        cameraSessionScope,
      })
      restoredCameraSessionScopeRef.current = cameraSessionScope
      if (restored) {
        return
      }
    }

    // Save camera state with debounce
    if (saveTimeoutRef.current !== null) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (cameraRef.current && controlsRef.current) {
        saveCameraToSession(cameraRef.current, {
          controls: controlsRef.current,
          cameraSessionScope,
        })
      }
    }, 150)
  }, [cameraSessionScope, controlsRef])

  return {
    handleCameraCreated,
    handleControlsChange,
  }
}
