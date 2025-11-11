import type * as React from "react"
import { forwardRef, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import packageJson from "../package.json"
import { CubeWithLabeledSides } from "./three-components/cube-with-labeled-sides"
import { Canvas } from "./react-three/Canvas"
import { OrbitControls } from "./react-three/OrbitControls"
import { Grid } from "./react-three/Grid"
import { useFrame, useThree } from "./react-three/ThreeContext"
import { Lights } from "./react-three/Lights"
import {
  saveCameraToSession,
  loadCameraFromSession,
} from "./hooks/useSessionCamera"
import {
  CameraAnimator,
  useCameraController,
} from "./hooks/useCameraController"
import type { CameraController } from "./hooks/useCameraController"
export type {
  CameraController,
  CameraPreset,
} from "./hooks/useCameraController"

declare global {
  interface Window {
    TSCI_MAIN_CAMERA_ROTATION: THREE.Euler
    TSCI_MAIN_CAMERA_QUATERNION: THREE.Quaternion
  }
}

if (typeof window !== "undefined") {
  window.TSCI_MAIN_CAMERA_ROTATION ??= new THREE.Euler(0, 0, 0)
  window.TSCI_MAIN_CAMERA_QUATERNION ??= new THREE.Quaternion()
}

export const RotationTracker = () => {
  const { camera } = useThree()
  useFrame(() => {
    if (camera) {
      window.TSCI_MAIN_CAMERA_ROTATION.copy(camera.rotation)
      window.TSCI_MAIN_CAMERA_QUATERNION.copy(camera.quaternion)
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
  shouldUseOrthographicCamera?: boolean
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
      shouldUseOrthographicCamera,
    },
    ref,
  ) => {
    const [isInteractionEnabled, setIsInteractionEnabled] = useState(
      !clickToInteractEnabled,
    )

    const saveTimeoutRef = useRef<any>(null)
    const controlsRef = useRef<any>(null)
    const cameraRef = useRef<THREE.Camera | null>(null)
    const restoredOnceRef = useRef(false)

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
      isOrthographic: shouldUseOrthographicCamera ?? false,
      defaultTarget,
      initialCameraPosition,
      onCameraControllerReady,
    })

    const orthographicFrustumSize = useMemo(() => {
      if (boardDimensions) {
        const width = boardDimensions.width ?? 0
        const height = boardDimensions.height ?? 0
        const maxDimension = Math.max(width, height)
        return Math.max(maxDimension * 1.5, 10)
      }
      const [x, y, z] = initialCameraPosition
      const maxComponent = Math.max(Math.abs(x), Math.abs(y), Math.abs(z))
      return Math.max(maxComponent * 2, 10)
    }, [initialCameraPosition, boardDimensions])

    const mutableInitialCameraPosition = useMemo(
      () =>
        [
          initialCameraPosition[0],
          initialCameraPosition[1],
          initialCameraPosition[2],
        ] as [number, number, number],
      [initialCameraPosition],
    )

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
          camera={{
    up: [0, 0, 1],
    position: mutableInitialCameraPosition,
    type: shouldUseOrthographicCamera ? "orthographic" : "perspective",
    frustumSize: orthographicFrustumSize,
  }}
  // The new prop from main:
          onCreated={({ camera }) => {
            cameraRef.current = camera
            if (!restoredOnceRef.current && controlsRef.current) {
              const restored = loadCameraFromSession(
                cameraRef.current,
                controlsRef.current,
              )
              if (restored) restoredOnceRef.current = true
            }
             // If nothing to restore, persist the initial state once controls exist
            if (controlsRef.current && !restoredOnceRef.current) {
              setTimeout(() => {
                if (cameraRef.current && controlsRef.current) {
                  saveCameraToSession(cameraRef.current, controlsRef.current)
                }
              }, 0)
            }
          }}
        >
          <CameraAnimator
            key={shouldUseOrthographicCamera ? "orthographic" : "perspective"}
            {...cameraAnimatorProps}
          />
          <RotationTracker />
          {isInteractionEnabled && (
            <OrbitControls
              key={shouldUseOrthographicCamera ? "orthographic" : "perspective"}
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
                controlsRef.current = controls

                // Attempt a one-time restore the first time controls are available
                if (
                  cameraRef.current &&
                  controlsRef.current &&
                  !restoredOnceRef.current
                ) {
                  const restored = loadCameraFromSession(
                    cameraRef.current,
                    controlsRef.current,
                  )
                  if (restored) {
                    restoredOnceRef.current = true
                    return
                  }
                }

                clearTimeout(saveTimeoutRef.current)
                saveTimeoutRef.current = setTimeout(() => {
                  if (cameraRef.current && controlsRef.current) {
                    saveCameraToSession(cameraRef.current, controlsRef.current)
                  }
                }, 150)
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
