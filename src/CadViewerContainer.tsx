import type * as React from "react"
import { forwardRef, useMemo, useState } from "react"
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

export const RotationTracker = () => {
  const { camera } = useThree()
  useFrame(() => {
    if (camera) {
      window.TSCI_MAIN_CAMERA_ROTATION = camera.rotation
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
              onControlsChange={handleControlsChange}
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
