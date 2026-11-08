import { useCallback, useEffect, useMemo, useRef } from "react"
import { useCameraController } from "../contexts/CameraControllerContext"
import { useFrame, useThree } from "../react-three/ThreeContext"
import {
  createReferenceObject,
  disposeReferenceObject,
} from "../reference-objects/create-reference-object"
import {
  fitCameraToBounds,
  getObjectBounds,
} from "../reference-objects/fit-camera-to-bounds"
import {
  type BoardCenter,
  type BoardDimensions,
  type Bounds3d,
  getReferenceObjectPosition,
  type ReferenceObjectType,
} from "../reference-objects/reference-object"

interface ReferenceObjectProps {
  type: ReferenceObjectType
  boardDimensions?: BoardDimensions
  boardCenter?: BoardCenter
}

export const ReferenceObject = ({
  type,
  boardDimensions,
  boardCenter,
}: ReferenceObjectProps) => {
  const { scene } = useThree()
  const object = useMemo(() => {
    const nextObject = createReferenceObject(type)
    const position = getReferenceObjectPosition(
      type,
      boardDimensions,
      boardCenter,
    )
    nextObject.position.set(position.x, position.y, position.z)
    return nextObject
  }, [type, boardDimensions, boardCenter])

  useEffect(() => {
    scene.add(object)
    return () => {
      scene.remove(object)
      disposeReferenceObject(object)
    }
  }, [scene, object])

  return null
}

export const FitCameraToComparison = ({ bounds }: { bounds: Bounds3d }) => {
  const { camera } = useThree()
  const { controlsRef } = useCameraController()

  useEffect(() => {
    fitCameraToBounds(camera, controlsRef.current, bounds)
  }, [bounds, camera, controlsRef])

  return null
}

export const FitCameraToBoardlessScene = ({
  onBoundsChange,
}: {
  onBoundsChange?: (bounds: Bounds3d) => void
}) => {
  const { camera, rootObject, scene } = useThree()
  const { controlsRef } = useCameraController()
  const lastFittedKeyRef = useRef<string | null>(null)
  const lastBoundsKeyRef = useRef<string | null>(null)
  const hasUserInteractedRef = useRef(false)

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    const handleStart = () => {
      hasUserInteractedRef.current = true
    }
    controls.addEventListener("start", handleStart)
    return () => {
      controls.removeEventListener("start", handleStart)
    }
  })

  const checkAndFit = useCallback(() => {
    if (hasUserInteractedRef.current) return
    const bounds = getObjectBounds(rootObject)
    if (!bounds) return

    const boundsKey = [
      bounds.minX,
      bounds.maxX,
      bounds.minY,
      bounds.maxY,
      bounds.minZ,
      bounds.maxZ,
    ]
      .map((v) => v.toFixed(4))
      .join(",")

    if (boundsKey !== lastBoundsKeyRef.current) {
      lastBoundsKeyRef.current = boundsKey
      onBoundsChange?.(bounds)
    }

    const fitKey = `${boundsKey}:${Boolean(controlsRef.current)}`
    if (fitKey === lastFittedKeyRef.current) return

    lastFittedKeyRef.current = fitKey
    fitCameraToBounds(camera, controlsRef.current, bounds)
  }, [camera, controlsRef, onBoundsChange, rootObject])

  useEffect(() => {
    checkAndFit()
    scene.addEventListener("cad-scene-updated" as any, checkAndFit)
    return () => {
      scene.removeEventListener("cad-scene-updated" as any, checkAndFit)
    }
  }, [checkAndFit, scene])

  useFrame(checkAndFit, [checkAndFit])

  return null
}
