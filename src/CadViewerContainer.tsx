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
import type { OrbitControls as ThreeOrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

interface CameraAnimatorProps {
  defaultTarget: THREE.Vector3
  controlsRef: React.MutableRefObject<ThreeOrbitControls | null>
  onReady?: (
    controller: { animateTo: CameraController["animateTo"] } | null,
  ) => void
}

const CameraAnimator: React.FC<CameraAnimatorProps> = ({
  defaultTarget,
  controlsRef,
  onReady,
}) => {
  const { camera } = useThree()
  const animationRef = useRef<{
    fromPosition: THREE.Vector3
    toPosition: THREE.Vector3
    fromTarget: THREE.Vector3
    toTarget: THREE.Vector3
    fromUp: THREE.Vector3
    toUp: THREE.Vector3
    startTime: number
    duration: number
  } | null>(null)

  const animateTo = useCallback<CameraController["animateTo"]>(
    ({ position, target, up, durationMs = 600 }) => {
      if (!camera) return

      const currentTarget = controlsRef.current?.target ?? defaultTarget

      animationRef.current = {
        fromPosition: camera.position.clone(),
        toPosition: new THREE.Vector3(position[0], position[1], position[2]),
        fromTarget: currentTarget.clone(),
        toTarget: new THREE.Vector3(
          ...(target ?? [defaultTarget.x, defaultTarget.y, defaultTarget.z]),
        ),
        fromUp: camera.up.clone(),
        toUp: new THREE.Vector3(...(up ?? [0, 0, 1])),
        startTime: performance.now(),
        duration: durationMs,
      }
    },
    [camera, controlsRef, defaultTarget],
  )

  useEffect(() => {
    if (!onReady || !camera) return
    onReady({ animateTo })
    return () => {
      onReady(null)
    }
  }, [animateTo, camera, onReady])

  useFrame(() => {
    if (!camera || !animationRef.current) return

    const {
      fromPosition,
      toPosition,
      fromTarget,
      toTarget,
      fromUp,
      toUp,
      startTime,
      duration,
    } = animationRef.current

    const elapsed = performance.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = easeInOutCubic(progress)

    camera.position.lerpVectors(fromPosition, toPosition, eased)
    const nextTarget = fromTarget.clone().lerp(toTarget, eased)
    camera.up.lerpVectors(fromUp, toUp, eased)

    controlsRef.current?.target.copy(nextTarget)
    camera.lookAt(nextTarget)
    controlsRef.current?.update()

    if (progress >= 1) {
      animationRef.current = null
    }
  })

  return null
}

export const RotationTracker = () => {
  const { camera } = useThree()
  useFrame(() => {
    if (camera) {
      window.TSCI_MAIN_CAMERA_ROTATION = camera.rotation
    }
  })

  return null
}

export type CameraPreset =
  | "Custom"
  | "Top-Down"
  | "Top Left Corner"
  | "Top Right Corner"
  | "Left Sideview"
  | "Right Sideview"
  | "Front"
  | "Top Centered"

export interface CameraAnimationConfig {
  position: readonly [number, number, number]
  target?: readonly [number, number, number]
  up?: readonly [number, number, number]
  durationMs?: number
}

export interface CameraController {
  animateTo: (config: CameraAnimationConfig) => void
  animateToPreset: (preset: CameraPreset) => void
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
      initialCameraPosition = [5, 5, 5],
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

    const controlsRef = useRef<ThreeOrbitControls | null>(null)

    const defaultTarget = useMemo(() => {
      if (orbitTarget) {
        return new THREE.Vector3(orbitTarget[0], orbitTarget[1], orbitTarget[2])
      }
      return new THREE.Vector3(0, 0, 0)
    }, [orbitTarget])

    const baseDistance = useMemo(() => {
      const [x, y, z] = initialCameraPosition ?? [5, 5, 5]
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
        const distance = baseDistance
        const heightOffset = distance * 0.3

        switch (preset) {
          case "Top Centered":
            return {
              position: [
                defaultTarget.x,
                defaultTarget.y,
                defaultTarget.z + distance * 0.75,
              ],
              target: targetVector,
              up: [0, 0, 1],
            }
          case "Top-Down":
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
                defaultTarget.x - distance,
                defaultTarget.y + distance,
                defaultTarget.z + distance,
              ],
              target: targetVector,
              up: [0, 0, 1],
            }
          case "Top Right Corner":
            return {
              position: [
                defaultTarget.x + distance,
                defaultTarget.y + distance,
                defaultTarget.z + distance,
              ],
              target: targetVector,
              up: [0, 0, 1],
            }
          case "Left Sideview":
            return {
              position: [
                defaultTarget.x - distance,
                defaultTarget.y,
                defaultTarget.z + heightOffset,
              ],
              target: targetVector,
              up: [0, 0, 1],
            }
          case "Right Sideview":
            return {
              position: [
                defaultTarget.x + distance,
                defaultTarget.y,
                defaultTarget.z + heightOffset,
              ],
              target: targetVector,
              up: [0, 0, 1],
            }
          case "Front":
            return {
              position: [
                defaultTarget.x,
                defaultTarget.y - distance,
                defaultTarget.z + heightOffset,
              ],
              target: targetVector,
              up: [0, 0, 1],
            }
          case "Custom":
          default:
            return null
        }
      },
      [baseDistance, defaultTarget],
    )

    const handleControllerReady = useCallback(
      (controller: { animateTo: CameraController["animateTo"] } | null) => {
        if (!onCameraControllerReady) return
        if (!controller) {
          onCameraControllerReady(null)
          return
        }

        const enhancedController: CameraController = {
          animateTo: controller.animateTo,
          animateToPreset: (preset) => {
            if (preset === "Custom") return
            const config = getPresetConfig(preset)
            if (!config) return
            controller.animateTo(config)
          },
        }

        onCameraControllerReady(enhancedController)
      },
      [getPresetConfig, onCameraControllerReady],
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
          camera={{ up: [0, 0, 1], position: initialCameraPosition }}
        >
          <CameraAnimator
            defaultTarget={defaultTarget}
            controlsRef={controlsRef}
            onReady={handleControllerReady}
          />
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
                controlsRef.current = controls
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
