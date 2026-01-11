import { useCallback, RefObject } from "react"
import type * as THREE from "three"
import type { OrbitControls as ThreeOrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

interface CustomViewHandlersContext {
  mainCameraRef: RefObject<THREE.Camera | null>
  controlsRef: RefObject<ThreeOrbitControls | null>
  saveCustomView: (
    name: string,
    view: {
      position: readonly [number, number, number]
      target: readonly [number, number, number]
      up: readonly [number, number, number]
    },
  ) => void
  deleteCustomView: (id: string) => void
  showToast: (message: string, duration: number) => void
  closeMenu: () => void
}

export function useCustomViewHandlers(ctx: CustomViewHandlersContext) {
  const {
    mainCameraRef,
    controlsRef,
    saveCustomView,
    deleteCustomView,
    showToast,
    closeMenu,
  } = ctx

  const getCurrentCameraState = useCallback(() => {
    const camera = mainCameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return null

    return {
      position: camera.position.toArray() as [number, number, number],
      target: controls.target.toArray() as [number, number, number],
      up: camera.up.toArray() as [number, number, number],
    }
  }, [mainCameraRef, controlsRef])

  const handleSaveCustomView = useCallback(
    (name: string) => {
      const state = getCurrentCameraState()
      if (!state) {
        showToast("Unable to save camera view", 1500)
        return
      }
      saveCustomView(name, state)
      showToast(`Saved "${name}"`, 1500)
      closeMenu()
    },
    [getCurrentCameraState, saveCustomView, showToast, closeMenu],
  )

  const handleDeleteCustomView = useCallback(
    (id: string) => {
      deleteCustomView(id)
      showToast("Custom view deleted", 1500)
    },
    [deleteCustomView, showToast],
  )

  return {
    handleSaveCustomView,
    handleDeleteCustomView,
  }
}
