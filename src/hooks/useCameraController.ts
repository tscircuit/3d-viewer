import type * as React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
  controlsVersion: number
  onReady?: (
    controller: { animateTo: CameraController["animateTo"] } | null,
  ) => void
}

export const CameraAnimator: React.FC<CameraAnimatorProps> = ({
  defaultTarget,
  controlsRef,
  controlsVersion,
  onReady,
}) => {
  const { camera } = useThree()
  const cameraRef = useRef(camera)
  cameraRef.current = camera

  const animationRef = useRef<{
    fromPosition: THREE.Vector3
    toPosition: THREE.Vector3
    fromTarget: THREE.Vector3
    toTarget: THREE.Vector3
    fromQuaternion: THREE.Quaternion
    toQuaternion: THREE.Quaternion
    finalQuaternion: THREE.Quaternion
    finalUp: THREE.Vector3
    fromZoom?: number
    toZoom?: number
    startTime: number
    duration: number
  } | null>(null)
  const tempQuaternion = useRef(new THREE.Quaternion())
  const tempTarget = useRef(new THREE.Vector3())
  const orientationHelper = useRef(new THREE.Object3D())

  const animateTo = useCallback<CameraController["animateTo"]>(
    ({ position, target, up, durationMs = 600 }) => {
      const currentCamera = cameraRef.current

      if (!currentCamera) {
        return
      }

      if (!controlsRef.current) {
        return
      }

      const currentTarget = controlsRef.current?.target ?? defaultTarget

      const toPosition = new THREE.Vector3(
        position[0],
        position[1],
        position[2],
      )
      const resolvedTarget = target
        ? new THREE.Vector3(target[0], target[1], target[2])
        : defaultTarget.clone()
      const resolvedUp = new THREE.Vector3(...(up ?? [0, 0, 1]))
      const viewDirection = resolvedTarget.clone().sub(toPosition).normalize()

      if (viewDirection.lengthSq() > 0) {
        const cross = new THREE.Vector3().crossVectors(
          viewDirection,
          resolvedUp,
        )
        if (cross.lengthSq() < 1e-6) {
          const fallbackAxes = [
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 0, 1),
          ]
          for (const axis of fallbackAxes) {
            if (Math.abs(viewDirection.dot(axis)) < 0.95) {
              resolvedUp.copy(axis)
              break
            }
          }
        }
      }

      resolvedUp.normalize()

      const toOrientationHelper = orientationHelper.current
      toOrientationHelper.position.copy(toPosition)
      toOrientationHelper.up.copy(resolvedUp)
      toOrientationHelper.lookAt(resolvedTarget)

      const toQuaternion = toOrientationHelper.quaternion.clone().normalize()
      const fromQuaternion = currentCamera.quaternion.clone().normalize()
      const fromPosition = currentCamera.position.clone()
      const fromTarget = currentTarget.clone()

      const slerpTarget = toQuaternion.clone()
      if (fromQuaternion.dot(slerpTarget) < 0) {
        slerpTarget.x *= -1
        slerpTarget.y *= -1
        slerpTarget.z *= -1
        slerpTarget.w *= -1
      }

      let fromZoom: number | undefined
      let toZoom: number | undefined

      if (currentCamera instanceof THREE.OrthographicCamera) {
        fromZoom = currentCamera.zoom

        const toDistance = toPosition.distanceTo(resolvedTarget)
        const baseFrustumHeight = currentCamera.top - currentCamera.bottom
        const targetFOV = 45 * (Math.PI / 180)
        const idealVisibleHeight = 2 * Math.tan(targetFOV / 2) * toDistance
        const calculatedZoom = baseFrustumHeight / idealVisibleHeight

        toZoom = Math.max(0.1, Math.min(10, calculatedZoom))
      }

      if (controlsRef.current) {
        controlsRef.current.enabled = false
      }

      animationRef.current = {
        fromPosition,
        toPosition,
        fromTarget,
        toTarget: resolvedTarget,
        fromQuaternion,
        toQuaternion: slerpTarget,
        finalQuaternion: toQuaternion,
        finalUp: resolvedUp.clone(),
        fromZoom,
        toZoom,
        startTime: performance.now(),
        duration: durationMs,
      }
    },
    [controlsRef, defaultTarget],
  )

  useEffect(() => {
    if (!onReady || !cameraRef.current) {
      if (onReady) onReady(null)
      return
    }

    const hasControls = controlsRef.current !== null
    if (hasControls) {
      onReady({ animateTo })
    } else {
      onReady(null)
    }

    return () => {
      onReady(null)
    }
  }, [animateTo, onReady, controlsVersion])

  useEffect(() => {
    const currentCamera = cameraRef.current
    if (!currentCamera || !controlsRef.current) return

    const controls = controlsRef.current
    const savedPosition = currentCamera.position.clone()
    const savedQuaternion = currentCamera.quaternion.clone()
    const savedTarget = controls.target.clone()

    const wasEnabled = controls.enabled
    const wasDamping = controls.enableDamping
    controls.enabled = false
    controls.enableDamping = false

    controls.update()

    if (!currentCamera.position.equals(savedPosition)) {
      currentCamera.position.copy(savedPosition)
      currentCamera.quaternion.copy(savedQuaternion)
      controls.target.copy(savedTarget)
      currentCamera.updateMatrixWorld()
    }

    controls.enableDamping = wasDamping
    controls.enabled = wasEnabled
  }, [camera])

  useFrame(() => {
    if (!animationRef.current) return
    
    const currentCamera = cameraRef.current
    if (!currentCamera) return

    const {
      fromPosition,
      toPosition,
      fromTarget,
      toTarget,
      fromQuaternion,
      toQuaternion,
      finalQuaternion,
      finalUp,
      fromZoom,
      toZoom,
      startTime,
      duration,
    } = animationRef.current

    const elapsed = performance.now() - startTime
    const progress = duration <= 0 ? 1 : Math.min(elapsed / duration, 1)
    const eased = easeInOutCubic(progress)

    currentCamera.position.lerpVectors(fromPosition, toPosition, eased)

    const nextTarget = tempTarget.current
    nextTarget.copy(fromTarget).lerp(toTarget, eased)

    const interpolatedQuaternion = tempQuaternion.current
    interpolatedQuaternion.copy(fromQuaternion).slerp(toQuaternion, eased)

    currentCamera.quaternion.copy(interpolatedQuaternion)

    if (
      currentCamera instanceof THREE.OrthographicCamera &&
      fromZoom !== undefined &&
      toZoom !== undefined
    ) {
      currentCamera.zoom = fromZoom + (toZoom - fromZoom) * eased
      currentCamera.updateProjectionMatrix()
    }

    controlsRef.current?.target.copy(nextTarget)
    currentCamera.updateMatrixWorld()
    controlsRef.current?.update()

    if (progress >= 1) {
      currentCamera.position.copy(toPosition)
      currentCamera.quaternion.copy(finalQuaternion)
      currentCamera.up.copy(finalUp)

      if (
        currentCamera instanceof THREE.OrthographicCamera &&
        toZoom !== undefined
      ) {
        currentCamera.zoom = toZoom
        currentCamera.updateProjectionMatrix()
      }

      currentCamera.updateMatrixWorld()
      controlsRef.current?.target.copy(toTarget)

      if (controlsRef.current) {
        controlsRef.current.enabled = true
        controlsRef.current.update()
        if (
          "saveState" in controlsRef.current &&
          typeof controlsRef.current.saveState === "function"
        ) {
          controlsRef.current.saveState()
        }
      }

      animationRef.current = null
    }
  })

  return null
}

interface UseCameraControllerOptions {
  isOrthographic: boolean
  defaultTarget: THREE.Vector3
  initialCameraPosition?: readonly [number, number, number]
  onCameraControllerReady?: (controller: CameraController | null) => void
}

interface UseCameraControllerResult {
  cameraAnimatorProps: CameraAnimatorProps
  handleControlsChange: (controls: ThreeOrbitControls | null) => void
}

export const useCameraController = ({
  isOrthographic,
  defaultTarget,
  initialCameraPosition,
  onCameraControllerReady,
}: UseCameraControllerOptions): UseCameraControllerResult => {
  const controlsRef = useRef<ThreeOrbitControls | null>(null)
  const [controlsVersion, setControlsVersion] = useState(0)

  const baseDistance = useMemo(() => {
    const [x, y, z] = initialCameraPosition ?? [5, 5, 5]
    const distance = Math.hypot(
      x - defaultTarget.x,
      y - defaultTarget.y,
      z - defaultTarget.z,
    )
    return distance > 0 ? distance : 5
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCameraPosition, defaultTarget, isOrthographic])

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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [getPresetConfig, onCameraControllerReady, isOrthographic],
  )

  useEffect(() => {
    controlsRef.current = null
    setControlsVersion(0)
  }, [isOrthographic])

  const handleControlsChange = useCallback(
    (controls: ThreeOrbitControls | null) => {
      controlsRef.current = controls
      if (controls !== null) {
        setControlsVersion((v) => v + 1)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [isOrthographic],
  )

  const cameraAnimatorProps = useMemo<CameraAnimatorProps>(
    () => ({
      defaultTarget,
      controlsRef,
      controlsVersion,
      onReady: handleControllerReady,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [defaultTarget, handleControllerReady, controlsVersion, isOrthographic],
  )

  return { cameraAnimatorProps, handleControlsChange }
}
