import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type MutableRefObject,
  type Dispatch,
  type SetStateAction,
} from "react"
import {
  saveCameraPresetToSession,
  loadCameraPresetFromSession,
} from "../contexts/CameraControllerContext"
import type { CameraPreset, CameraController } from "./cameraAnimation"

interface UseCameraPresetPersistenceProps {
  viewerKey: string | undefined
  lastPresetSelectTime: MutableRefObject<number>
}

interface UseCameraPresetPersistenceResult {
  cameraPreset: CameraPreset
  setCameraPreset: Dispatch<SetStateAction<CameraPreset>>
  isRestoringCameraRef: MutableRefObject<boolean>
  handleCameraControllerReadyForPreset: (
    controller: CameraController | null,
  ) => void
}

const PRESET_RESTORE_DELAY = 50
const PRESET_RESTORE_FLAG_DURATION = 1000
const VIEWERKEY_RESTORE_FLAG_DURATION = 2000

export function useCameraPresetPersistence({
  viewerKey,
  lastPresetSelectTime,
}: UseCameraPresetPersistenceProps): UseCameraPresetPersistenceResult {
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>(() => {
    const stored = loadCameraPresetFromSession()
    return stored ?? "Custom"
  })

  const isRestoringCameraRef = useRef(false)

  // Persist camera preset to session storage
  useEffect(() => {
    saveCameraPresetToSession(cameraPreset)
  }, [cameraPreset])

  // Re-read camera preset from session when viewerKey changes (file switch)
  useEffect(() => {
    const stored = loadCameraPresetFromSession()
    if (stored) {
      // Set flag to prevent handleUserInteraction from resetting to Custom
      isRestoringCameraRef.current = true
      lastPresetSelectTime.current = Date.now()
      setCameraPreset(stored)
      // Keep the restoring flag true for a bit to prevent premature reset
      const timeout = setTimeout(() => {
        isRestoringCameraRef.current = false
      }, VIEWERKEY_RESTORE_FLAG_DURATION)
      return () => clearTimeout(timeout)
    }
  }, [viewerKey, lastPresetSelectTime])

  // Handle camera controller ready - apply stored preset if needed
  const handleCameraControllerReadyForPreset = useCallback(
    (controller: CameraController | null) => {
      // If a named preset is stored, apply it after a short delay to override
      // any conflicting camera session restoration
      if (controller && cameraPreset !== "Custom") {
        isRestoringCameraRef.current = true
        lastPresetSelectTime.current = Date.now()
        setTimeout(() => {
          controller.animateToPreset(cameraPreset)
          // Keep the restoring flag true for a bit longer to prevent premature reset
          setTimeout(() => {
            isRestoringCameraRef.current = false
          }, PRESET_RESTORE_FLAG_DURATION)
        }, PRESET_RESTORE_DELAY)
      }
    },
    [cameraPreset, lastPresetSelectTime],
  )

  return {
    cameraPreset,
    setCameraPreset,
    isRestoringCameraRef,
    handleCameraControllerReadyForPreset,
  }
}
