import type * as React from "react"
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import * as THREE from "three"
import packageJson from "../package.json"
import { CubeWithLabeledSides } from "./three-components/cube-with-labeled-sides"
import { Canvas } from "./react-three/Canvas"
import { OrbitControls } from "./react-three/OrbitControls"
import { Grid } from "./react-three/Grid"
import { useFrame, useThree } from "./react-three/ThreeContext"
import { Lights } from "./react-three/Lights"
import {
  CameraAnimator,
  useCameraController,
} from "./hooks/useCameraController"
import type { CameraController } from "./hooks/useCameraController"
export type {
  CameraController,
  CameraPreset,
} from "./hooks/useCameraController"
import type { OrbitControls as ThreeOrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import {
  loadCameraFromSession,
  saveCameraToSession,
} from "./hooks/useSessionCamera"

const CAMERA_SESSION_SAVE_MIN_INTERVAL_MS = 75

declare global {
  interface Window {
    TSCI_MAIN_CAMERA_STATE?: {
      quaternion: THREE.Quaternion
    }
  }
}

export const RotationTracker = () => {
  const { camera } = useThree()

  useFrame(() => {
    if (camera && typeof window !== "undefined") {
      window.TSCI_MAIN_CAMERA_ROTATION = camera.rotation
      const state =
        window.TSCI_MAIN_CAMERA_STATE ??
        (window.TSCI_MAIN_CAMERA_STATE = {
          quaternion: new THREE.Quaternion(),
        })
      state.quaternion.copy(camera.quaternion)
    }
  })

  return null
}

interface Props {
  autoRotateDisabled?: boolean
  initialCameraPosition?: readonly [number, number, number] | undefined
  clickToInteractEnabled?: boolean
  boardDimensions?: { width?: number; height?: number }
  boardCenter?: { x: number; y: number }
  onUserInteraction?: () => void
  onCameraControllerReady?: (controller: CameraController | null) => void
}

export const CadViewerContainer = forwardRef<
  THREE.Object3D,
  React.PropsWithChildren<Props>
>(
  (
    {
      children,
      initialCameraPosition = [5, -5, 5],
      autoRotateDisabled,
      clickToInteractEnabled = false,
      boardDimensions,
      boardCenter,
      onUserInteraction,
      onCameraControllerReady,
    },
    ref,
  ) => {
    const [isInteractionEnabled, setIsInteractionEnabled] = useState(
      !clickToInteractEnabled,
    )

    const controlsRef = useRef<ThreeOrbitControls | null>(null)
    const cameraRef = useRef<THREE.Camera | null>(null)
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastSaveTimeRef = useRef(0)
    const hasAttemptedSessionRestore = useRef(false)

    const flushCameraToSession = useCallback(() => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }

      if (!cameraRef.current || !controlsRef.current) {
        return
      }

      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now()
      lastSaveTimeRef.current = now
      saveCameraToSession(cameraRef.current, controlsRef.current)
    }, [saveCameraToSession])

    const scheduleSessionSave = useCallback(() => {
      if (!cameraRef.current || !controlsRef.current) {
        return
      }

      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now()
      const elapsed = now - lastSaveTimeRef.current

      if (elapsed >= CAMERA_SESSION_SAVE_MIN_INTERVAL_MS) {
        lastSaveTimeRef.current = now
        saveCameraToSession(cameraRef.current, controlsRef.current)
        return
      }

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      const delay = Math.max(0, CAMERA_SESSION_SAVE_MIN_INTERVAL_MS - elapsed)
      saveTimeoutRef.current = setTimeout(() => {
        flushCameraToSession()
      }, delay)
    }, [flushCameraToSession, saveCameraToSession])

    useEffect(() => {
      const handleVisibilityChange = () => {
        if (
          typeof document !== "undefined" &&
          document.visibilityState === "hidden"
        ) {
          flushCameraToSession()
        }
      }

      if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", handleVisibilityChange)
      }

      return () => {
        if (typeof document !== "undefined") {
          document.removeEventListener(
            "visibilitychange",
            handleVisibilityChange,
          )
        }
      }
    }, [flushCameraToSession])

    useEffect(() => {
      return () => {
        flushCameraToSession()
      }
    }, [flushCameraToSession])

    const tryRestoreCamera = useCallback(() => {
      if (
        hasAttemptedSessionRestore.current ||
        !cameraRef.current ||
        !controlsRef.current
      ) {
        return
      }

      hasAttemptedSessionRestore.current = true
      const restored = loadCameraFromSession(
        cameraRef.current,
        controlsRef.current,
      )

      if (restored && typeof window !== "undefined") {
        window.TSCI_MAIN_CAMERA_ROTATION = cameraRef.current.rotation
        const state =
          window.TSCI_MAIN_CAMERA_STATE ??
          (window.TSCI_MAIN_CAMERA_STATE = {
            quaternion: new THREE.Quaternion(),
          })
        state.quaternion.copy(cameraRef.current.quaternion)
      }
    }, [loadCameraFromSession])

    const gridSectionSize = useMemo(() => {
      if (!boardDimensions) return 10
      const width = boardDimensions.width ?? 0
      const height = boardDimensions.height ?? 0
      const largest = Math.max(width, height)
      const desired = largest * 1.5
      return desired > 10 ? desired : 10
    }, [boardDimensions])

    const orbitTarget = useMemo(() => {
      if (!boardCenter) return undefined
      return [boardCenter.x, boardCenter.y, 0] as [number, number, number]
    }, [boardCenter])

    const defaultTarget = useMemo(() => {
      if (orbitTarget) {
        return new THREE.Vector3(orbitTarget[0], orbitTarget[1], orbitTarget[2])
      }
      return new THREE.Vector3(0, 0, 0)
    }, [orbitTarget])

    const { cameraAnimatorProps, handleControlsChange } = useCameraController({
      defaultTarget,
      initialCameraPosition,
      onCameraControllerReady,
    })

    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 120,
            height: 120,
          }}
        >
          <Canvas
            camera={{
              up: [0, 0, 1],
              position: [1, 1, 1],
            }}
            style={{ zIndex: 10 }}
          >
            <CubeWithLabeledSides />
          </Canvas>
        </div>
        <Canvas
          ref={ref}
          scene={{ up: new THREE.Vector3(0, 0, 1) }}
          camera={{ up: [0, 0, 1], position: initialCameraPosition }}
          onCreated={({ camera }) => {
            cameraRef.current = camera
            tryRestoreCamera()
          }}
        >
          <CameraAnimator {...cameraAnimatorProps} />
          <RotationTracker />
          {isInteractionEnabled && (
            <OrbitControls
              autoRotate={!autoRotateDisabled}
              autoRotateSpeed={1}
              onStart={onUserInteraction}
              rotateSpeed={0.5}
              panSpeed={0.75}
              zoomSpeed={0.5}
              enableDamping={true}
              dampingFactor={0.1}
              target={orbitTarget}
              onControlsChange={(controls) => {
                handleControlsChange(controls)

                if (!controls) {
                  flushCameraToSession()
                  controlsRef.current = null
                  return
                }

                controlsRef.current = controls
                tryRestoreCamera()

                if (!cameraRef.current) {
                  return
                }
                scheduleSessionSave()
              }}
            />
          )}
          <Lights />
          <Grid
            rotation={[Math.PI / 2, 0, 0]}
            infiniteGrid={true}
            cellSize={3}
            sectionSize={gridSectionSize}
            args={[gridSectionSize, gridSectionSize]}
          />
          {children}
        </Canvas>
        <div
          style={{
            position: "absolute",
            right: 24,
            bottom: 24,
            fontFamily: "sans-serif",
            color: "white",
            WebkitTextStroke: "0.5px rgba(0, 0, 0, 0.5)",
            fontSize: 11,
          }}
        >
          @{packageJson.version}
        </div>
        {clickToInteractEnabled && !isInteractionEnabled && (
          <button
            type="button"
            onClick={() => setIsInteractionEnabled(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setIsInteractionEnabled(true)
              }
            }}
            style={{
              position: "absolute",
              inset: 0,
              cursor: "pointer",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                color: "white",
                padding: "12px 24px",
                borderRadius: "8px",
                fontSize: "16px",
                fontFamily: "sans-serif",
                pointerEvents: "none",
              }}
            >
              Click to Interact
            </div>
          </button>
        )}
      </div>
    )
  },
)
