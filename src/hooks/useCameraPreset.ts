import { useCallback, RefObject } from "react"
import type { CameraPreset, CameraController } from "./cameraAnimation"
import type { CustomCameraView } from "./useCustomCameraViews"

interface CameraPresetParams {
  preset: CameraPreset
}

interface CameraPresetContext {
  setAutoRotate: (value: boolean) => void
  setAutoRotateUserToggled: (value: boolean) => void
  setCameraPreset: (preset: CameraPreset) => void
  closeMenu: () => void
  cameraControllerRef: RefObject<CameraController | null>
  isAnimatingRef: RefObject<boolean>
  lastPresetSelectTime: RefObject<number>
  customViews: CustomCameraView[]
}

export function useCameraPreset(ctx: CameraPresetContext) {
  const {
    setAutoRotate,
    setAutoRotateUserToggled,
    setCameraPreset,
    closeMenu,
    cameraControllerRef,
    isAnimatingRef,
    lastPresetSelectTime,
    customViews,
  } = ctx

  const handleCameraPresetSelect = useCallback(
    (params: CameraPresetParams) => {
      const { preset } = params

      // Stop auto-rotate when a preset is selected
      setAutoRotate(false)
      setAutoRotateUserToggled(true)

      setCameraPreset(preset)
      closeMenu()
      lastPresetSelectTime.current = Date.now()

      if (preset === "Custom") return

      isAnimatingRef.current = true

      if (preset.startsWith("custom:")) {
        const viewId = preset.slice(7)
        const customView = customViews.find((v) => v.id === viewId)
        if (customView) {
          cameraControllerRef.current?.animateTo({
            position: customView.position,
            target: customView.target,
            up: customView.up,
          })
        }
      } else {
        cameraControllerRef.current?.animateToPreset(preset)
      }

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
      customViews,
    ],
  )

  return {
    handleCameraPresetSelect: (preset: CameraPreset) =>
      handleCameraPresetSelect({ preset }),
  }
}
