import type * as React from "react"
import { useCallback, useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import type { OrbitControls as ThreeOrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { useFrame, useThree } from "../react-three/ThreeContext"

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

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

export interface CameraAnimatorProps {
  defaultTarget: THREE.Vector3
  controlsRef: React.MutableRefObject<ThreeOrbitControls | null>
  onReady?: (
    controller: { animateTo: CameraController["animateTo"] } | null,
  ) => void
}

export const CameraAnimator: React.FC<CameraAnimatorProps> = ({
  defaultTarget,
  controlsRef,
  onReady,
}) => {
  const { camera } = useThree()
  const animationRef = useRef<{
    fromPosition: THREE.Vector3
    toPosition: THREE.Vector3
    fromQuaternion: THREE.Quaternion
    toQuaternion: THREE.Quaternion
    fromDistance: number
    toDistance: number
    toTarget: THREE.Vector3
    startTime: number
    duration: number
  } | null>(null)
  const tempQuaternion = useRef(new THREE.Quaternion())
  const tempForward = useRef(new THREE.Vector3())
  const tempTarget = useRef(new THREE.Vector3())
  const tempUp = useRef(new THREE.Vector3())

  const animateTo = useCallback<CameraController["animateTo"]>(
    ({ position, target, up, durationMs = 600 }) => {
      if (!camera) return

      const currentTarget = controlsRef.current?.target ?? defaultTarget

      const toPosition = new THREE.Vector3(
        position[0],
        position[1],
        position[2],
      )
      const resolvedTarget = target
        ? new THREE.Vector3(target[0], target[1], target[2])
        : defaultTarget.clone()
      const resolvedUp = new THREE.Vector3(...(up ?? [0, 0, 1])).normalize()

      const orientationHelper = new THREE.Object3D()
      orientationHelper.position.copy(toPosition)
      orientationHelper.up.copy(resolvedUp)
      orientationHelper.lookAt(resolvedTarget)

      const fromQuaternion = camera.quaternion.clone()
      const toQuaternion = orientationHelper.quaternion.clone()

      const fromPosition = camera.position.clone()
      const fromTarget = currentTarget.clone()
      const fromDistance = Math.max(1e-6, fromPosition.distanceTo(fromTarget))
      const toDistance = Math.max(1e-6, toPosition.distanceTo(resolvedTarget))

      animationRef.current = {
        fromPosition,
        toPosition,
        fromQuaternion,
        toQuaternion,
        fromDistance,
        toDistance,
        toTarget: resolvedTarget,
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
      fromQuaternion,
      toQuaternion,
      fromDistance,
      toDistance,
      toTarget,
      startTime,
      duration,
    } = animationRef.current

    const elapsed = performance.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = easeInOutCubic(progress)

    camera.position.lerpVectors(fromPosition, toPosition, eased)

    const interpolatedQuaternion = tempQuaternion.current
    interpolatedQuaternion.copy(fromQuaternion)
    interpolatedQuaternion.slerp(toQuaternion, eased)
    camera.quaternion.copy(interpolatedQuaternion)

    const distance = THREE.MathUtils.lerp(fromDistance, toDistance, eased)
    const forward = tempForward.current
    forward.set(0, 0, -1).applyQuaternion(interpolatedQuaternion)

    const nextTarget = tempTarget.current
    nextTarget.copy(camera.position).add(forward.multiplyScalar(distance))

    const upVector = tempUp.current
    upVector.set(0, 1, 0).applyQuaternion(interpolatedQuaternion).normalize()
    camera.up.copy(upVector)

    controlsRef.current?.target.copy(nextTarget)
    camera.updateMatrixWorld()
    controlsRef.current?.update()

    if (progress >= 1) {
      camera.position.copy(toPosition)
      camera.quaternion.copy(toQuaternion)
      const finalUp = tempUp.current
      finalUp.set(0, 1, 0).applyQuaternion(toQuaternion).normalize()
      camera.up.copy(finalUp)
      camera.updateMatrixWorld()
      controlsRef.current?.target.copy(toTarget)
      controlsRef.current?.update()
      animationRef.current = null
    }
  })

  return null
}

interface UseCameraControllerOptions {
  defaultTarget: THREE.Vector3
  initialCameraPosition?: readonly [number, number, number]
  onCameraControllerReady?: (controller: CameraController | null) => void
}

interface UseCameraControllerResult {
  cameraAnimatorProps: CameraAnimatorProps
  handleControlsChange: (controls: ThreeOrbitControls | null) => void
}

export const useCameraController = ({
  defaultTarget,
  initialCameraPosition,
  onCameraControllerReady,
}: UseCameraControllerOptions): UseCameraControllerResult => {
  const controlsRef = useRef<ThreeOrbitControls | null>(null)

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
        case "Top Centered": {
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

  const handleControlsChange = useCallback(
    (controls: ThreeOrbitControls | null) => {
      controlsRef.current = controls
    },
    [],
  )

  const cameraAnimatorProps = useMemo<CameraAnimatorProps>(
    () => ({
      defaultTarget,
      controlsRef,
      onReady: handleControllerReady,
    }),
    [defaultTarget, handleControllerReady],
  )

  return { cameraAnimatorProps, handleControlsChange }
}
