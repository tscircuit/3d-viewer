import type * as React from "react"
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react"
import * as THREE from "three"
import type { OrbitControls as ThreeOrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import type {
  CameraAnimationConfig,
  CameraController,
  CameraPreset,
} from "../hooks/cameraAnimation"

const CAMERA_KEY = "cadViewerCameraStateSession"

// Camera session storage functions
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

interface CameraControllerContextValue {
  controlsRef: React.MutableRefObject<ThreeOrbitControls | null>
  mainCameraRef: React.MutableRefObject<THREE.Camera | null>
  defaultTarget: THREE.Vector3
  baseDistance: number
  controller: CameraController | null
  setController: (controller: CameraController | null) => void
  getPresetConfig: (preset: CameraPreset) => CameraAnimationConfig | null
  handleControlsChange: (controls: ThreeOrbitControls | null) => void
  cameraType: "perspective" | "orthographic"
  setCameraType: (type: "perspective" | "orthographic") => void
  cameraPosition: readonly [number, number, number] | null
  setCameraPosition: (position: readonly [number, number, number]) => void
  cameraRotation: THREE.Euler
  setCameraRotation: (rotation: THREE.Euler) => void
  saveCameraToSession: (camera: THREE.Camera, controls: any) => void
  loadCameraFromSession: (camera: THREE.Camera, controls: any) => boolean
}

const CameraControllerContext = createContext<
  CameraControllerContextValue | undefined
>(undefined)

interface CameraControllerProviderProps {
  children: React.ReactNode
  defaultTarget: THREE.Vector3
  initialCameraPosition?: readonly [number, number, number]
}

export const CameraControllerProvider: React.FC<
  CameraControllerProviderProps
> = ({ children, defaultTarget, initialCameraPosition }) => {
  const controlsRef = useRef<ThreeOrbitControls | null>(null)
  const mainCameraRef = useRef<THREE.Camera | null>(null)
  const [controller, setController] = useState<CameraController | null>(null)
  const [cameraType, setCameraType] = useState<"perspective" | "orthographic">(
    "perspective",
  )
  const [cameraPosition, setCameraPosition] = useState<
    readonly [number, number, number] | null
  >(initialCameraPosition ?? null)
  const [cameraRotation, setCameraRotation] = useState<THREE.Euler>(
    new THREE.Euler(0, 0, 0),
  )

  const baseDistance = useMemo(() => {
    const [x, y, z] = initialCameraPosition ?? [5, -5, 5]
    const distance = Math.hypot(
      x - defaultTarget.x,
      y - defaultTarget.y,
      z - defaultTarget.z,
    )
    return distance > 0 ? distance : 5
  }, [initialCameraPosition, defaultTarget])

  const getPresetConfig = useCallback(
    (preset: CameraPreset): CameraAnimationConfig | null => {
      const targetVector = [
        defaultTarget.x,
        defaultTarget.y,
        defaultTarget.z,
      ] as const
      
      let distance = baseDistance
      if (mainCameraRef.current && controlsRef.current) {
        const currentTarget = controlsRef.current.target
        distance = Math.hypot(
          mainCameraRef.current.position.x - currentTarget.x,
          mainCameraRef.current.position.y - currentTarget.y,
          mainCameraRef.current.position.z - currentTarget.z,
        )
      }

      switch (preset) {
        case "Top Center Angled": {
          const angledOffset = distance / Math.sqrt(2)
          return {
            position: [
              defaultTarget.x,
              defaultTarget.y - angledOffset,
              defaultTarget.z + angledOffset,
            ],
            target: targetVector,
            up: [0, 0, 1],
          }
        }
        case "Top Down":
          return {
            position: [
              defaultTarget.x,
              defaultTarget.y,
              defaultTarget.z + distance,
            ],
            target: targetVector,
            up: [0, 0, 1],
          }
        case "Top Left Corner":
          return {
            position: [
              defaultTarget.x - distance * 0.6,
              defaultTarget.y - distance * 0.6,
              defaultTarget.z + distance * 0.6,
            ],
            target: targetVector,
            up: [0, 0, 1],
          }
        case "Top Right Corner":
          return {
            position: [
              defaultTarget.x + distance * 0.6,
              defaultTarget.y - distance * 0.6,
              defaultTarget.z + distance * 0.6,
            ],
            target: targetVector,
            up: [0, 0, 1],
          }
        case "Left Sideview":
          return {
            position: [
              defaultTarget.x - distance,
              defaultTarget.y,
              defaultTarget.z,
            ],
            target: targetVector,
            up: [0, 0, 1],
          }
        case "Right Sideview":
          return {
            position: [
              defaultTarget.x + distance,
              defaultTarget.y,
              defaultTarget.z,
            ],
            target: targetVector,
            up: [0, 0, 1],
          }
        case "Front":
          return {
            position: [
              defaultTarget.x,
              defaultTarget.y - distance,
              defaultTarget.z,
            ],
            target: targetVector,
            up: [0, 0, 1],
          }
        case "Custom":
        default:
          return null
      }
    },
    [baseDistance, defaultTarget, mainCameraRef, controlsRef],
  )

  const handleControlsChange = useCallback(
    (controls: ThreeOrbitControls | null) => {
      controlsRef.current = controls
    },
    [],
  )

  const cameraControllerContextValue = useMemo<CameraControllerContextValue>(
    () => ({
      controlsRef,
      mainCameraRef,
      defaultTarget,
      baseDistance,
      controller,
      setController,
      getPresetConfig,
      handleControlsChange,
      cameraType,
      setCameraType,
      cameraPosition,
      setCameraPosition,
      cameraRotation,
      setCameraRotation,
      saveCameraToSession,
      loadCameraFromSession,
    }),
    [
      defaultTarget,
      baseDistance,
      controller,
      getPresetConfig,
      handleControlsChange,
      cameraType,
      cameraPosition,
      cameraRotation,
    ],
  )

  return (
    <CameraControllerContext.Provider value={cameraControllerContextValue}>
      {children}
    </CameraControllerContext.Provider>
  )
}

export const useCameraController = () => {
  const context = useContext(CameraControllerContext)
  if (!context) {
    throw new Error(
      "useCameraController must be used within a CameraControllerProvider",
    )
  }
  return context
}
