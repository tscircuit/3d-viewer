import type * as React from "react"
import { useCallback, useEffect, useRef } from "react"
import * as THREE from "three"
import { useFrame } from "../react-three/ThreeContext"
import { useCameraController as useCameraControllerContext } from "../contexts/CameraControllerContext"

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
  | "Top Center Angled"

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

// Context-aware CameraAnimator that uses the CameraControllerContext
export const CameraAnimatorWithContext: React.FC = () => {
  const {
    controlsRef,
    mainCameraRef,
    defaultTarget,
    setController,
    getPresetConfig,
  } = useCameraControllerContext()
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
      if (!mainCameraRef.current) return

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
      const fromQuaternion = mainCameraRef.current.quaternion.clone()
      const fromPosition = mainCameraRef.current.position.clone()
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
    [mainCameraRef, controlsRef, defaultTarget],
  )

  const animateToPreset = useCallback(
    (preset: CameraPreset) => {
      if (preset === "Custom") return
      const config = getPresetConfig(preset)
      if (!config) return
      animateTo(config)
    },
    [animateTo, getPresetConfig],
  )

  useEffect(() => {
    if (!mainCameraRef.current) return
    const controller: CameraController = {
      animateTo,
      animateToPreset,
    }
    setController(controller)
    return () => {
      setController(null)
    }
  }, [animateTo, animateToPreset, mainCameraRef, setController])

  useFrame(() => {
    if (!mainCameraRef.current || !animationRef.current) return

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

    mainCameraRef.current.position.lerpVectors(fromPosition, toPosition, eased)

    const nextTarget = tempTarget.current
    nextTarget.copy(fromTarget).lerp(toTarget, eased)

    const baseHelper = baseOrientationHelper.current
    baseHelper.up.set(0, 0, 1)
    baseHelper.position.copy(mainCameraRef.current.position)
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

    mainCameraRef.current.quaternion
      .copy(baseQuaternion)
      .multiply(interpolatedRoll)
      .normalize()

    const upVector = tempUp.current
    upVector
      .set(0, 1, 0)
      .applyQuaternion(mainCameraRef.current.quaternion)
      .normalize()
    mainCameraRef.current.up.copy(upVector)

    controlsRef.current?.target.copy(nextTarget)
    mainCameraRef.current.updateMatrixWorld()
    controlsRef.current?.update()

    if (progress >= 1) {
      mainCameraRef.current.position.copy(toPosition)
      mainCameraRef.current.quaternion.copy(toQuaternion)
      mainCameraRef.current.up.set(0, 0, 1)
      mainCameraRef.current.updateMatrixWorld()
      controlsRef.current?.target.copy(toTarget)
      controlsRef.current?.update()
      animationRef.current = null
    }
  })

  return null
}
