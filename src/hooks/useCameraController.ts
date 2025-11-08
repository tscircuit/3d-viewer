import type * as React from "react"
import { useCallback, useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import type { OrbitControls as ThreeOrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { useFrame, useThree } from "../react-three/ThreeContext"

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

export type CameraPreset =
  | "Custom"
  | "Top Down"
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
    fromTarget: THREE.Vector3
    toTarget: THREE.Vector3
    toQuaternion: THREE.Quaternion
    rollFrom: THREE.Quaternion
    rollTo: THREE.Quaternion
    startTime: number
    duration: number
  } | null>(null)
  const tempQuaternion = useRef(new THREE.Quaternion())
  const tempTarget = useRef(new THREE.Vector3())
  const tempUp = useRef(new THREE.Vector3())
  const tempRoll = useRef(new THREE.Quaternion())
  const tempRollTarget = useRef(new THREE.Quaternion())
  const baseOrientationHelper = useRef(new THREE.Object3D())
  const orientationHelper = useRef(new THREE.Object3D())

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

      const toOrientationHelper = orientationHelper.current
      toOrientationHelper.position.copy(toPosition)
      toOrientationHelper.up.copy(resolvedUp)
      toOrientationHelper.lookAt(resolvedTarget)

      const toQuaternion = toOrientationHelper.quaternion.clone()
      const fromQuaternion = camera.quaternion.clone()
      const fromPosition = camera.position.clone()
      const fromTarget = currentTarget.clone()

      const baseHelper = baseOrientationHelper.current
      baseHelper.up.set(0, 0, 1)
      baseHelper.position.copy(fromPosition)
      baseHelper.lookAt(fromTarget)
      const baseFromQuaternion = baseHelper.quaternion.clone()

      baseHelper.up.set(0, 0, 1)
      baseHelper.position.copy(toPosition)
      baseHelper.lookAt(resolvedTarget)
      const baseToQuaternion = baseHelper.quaternion.clone()

      const rollFrom = baseFromQuaternion
        .clone()
        .invert()
        .multiply(fromQuaternion)
        .normalize()
      const rollTo = baseToQuaternion
        .clone()
        .invert()
        .multiply(toQuaternion)
        .normalize()

      animationRef.current = {
        fromPosition,
        toPosition,
        fromTarget,
        toTarget: resolvedTarget,
        toQuaternion,
        rollFrom,
        rollTo,
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
      toQuaternion,
      rollFrom,
      rollTo,
      startTime,
      duration,
    } = animationRef.current

    const elapsed = performance.now() - startTime
    const progress = duration <= 0 ? 1 : Math.min(elapsed / duration, 1)
    const eased = easeInOutCubic(progress)

    camera.position.lerpVectors(fromPosition, toPosition, eased)

    const nextTarget = tempTarget.current
    nextTarget.copy(fromTarget).lerp(toTarget, eased)

    const baseHelper = baseOrientationHelper.current
    baseHelper.up.set(0, 0, 1)
    baseHelper.position.copy(camera.position)
    baseHelper.lookAt(nextTarget)

    const baseQuaternion = tempQuaternion.current
    baseQuaternion.copy(baseHelper.quaternion)

    const interpolatedRoll = tempRoll.current
    interpolatedRoll.copy(rollFrom)
    const rollTarget = tempRollTarget.current
    rollTarget.copy(rollTo)
    if (rollFrom.dot(rollTo) < 0) {
      rollTarget.x *= -1
      rollTarget.y *= -1
      rollTarget.z *= -1
      rollTarget.w *= -1
    }
    rollTarget.normalize()
    interpolatedRoll.slerp(rollTarget, eased)

    camera.quaternion
      .copy(baseQuaternion)
      .multiply(interpolatedRoll)
      .normalize()

    const upVector = tempUp.current
    upVector.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize()
    camera.up.copy(upVector)

    controlsRef.current?.target.copy(nextTarget)
    camera.updateMatrixWorld()
    controlsRef.current?.update()
    controlsRef.current?.dispatchEvent?.({ type: "change" })

    if (progress >= 1) {
      camera.position.copy(toPosition)
      camera.quaternion.copy(toQuaternion)
      camera.up.set(0, 0, 1)
      camera.updateMatrixWorld()
      controlsRef.current?.target.copy(toTarget)
      controlsRef.current?.update()
      controlsRef.current?.dispatchEvent?.({ type: "change" })
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
