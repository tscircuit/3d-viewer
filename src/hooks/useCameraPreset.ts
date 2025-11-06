import { useCallback, RefObject } from "react"
import type { CameraPreset, CameraController } from "./useCameraController"

interface UseCameraPresetProps {
  setAutoRotate: (value: boolean) => void
  setAutoRotateUserToggled: (value: boolean) => void
  setCameraPreset: (preset: CameraPreset) => void
  closeMenu: () => void
  cameraControllerRef: RefObject<CameraController | null>
  isAnimatingRef: RefObject<boolean>
  lastPresetSelectTime: RefObject<number>
}

export function useCameraPreset({
  setAutoRotate,
  setAutoRotateUserToggled,
  setCameraPreset,
  closeMenu,
  cameraControllerRef,
  isAnimatingRef,
  lastPresetSelectTime,
}: UseCameraPresetProps) {
  const handleCameraPresetSelect = useCallback(
    (preset: CameraPreset) => {
      // Stop auto-rotate when a preset is selected
      setAutoRotate(false)
      setAutoRotateUserToggled(true)

      setCameraPreset(preset)
      closeMenu()
      lastPresetSelectTime.current = Date.now()

      if (preset === "Custom") return

      isAnimatingRef.current = true
      cameraControllerRef.current?.animateToPreset(preset)

      // Reset the animation flag after the animation would be complete
      setTimeout(() => {
        isAnimatingRef.current = false
      }, 600) // Match this with the animation duration in useCameraController
    },
    [
      setAutoRotate,
      setAutoRotateUserToggled,
      setCameraPreset,
      closeMenu,
      cameraControllerRef,
      isAnimatingRef,
      lastPresetSelectTime,
    ],
  )

  return {
    handleCameraPresetSelect,
  }
}
